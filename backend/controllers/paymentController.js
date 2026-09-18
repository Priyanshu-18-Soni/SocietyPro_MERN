const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Society = require('../models/Society');
const Ledger = require('../models/Ledger');
const calculateLateFee = require('../utils/calculateLateFee');

// Create a Razorpay order (Resident initiates payment for a specific bill)
const createOrder = async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({ message: 'billId is required to create a payment order' });
    }

    // Atomic tenant + resident scoping to locate the exact bill
    const bill = await Payment.findOne({
      _id: billId,
      societyId: req.user.societyId,
      residentId: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (bill.status === 'captured') {
      return res.status(400).json({ message: 'This bill has already been settled' });
    }

    if (!bill.amount || bill.amount <= 0) {
      return res.status(400).json({ message: 'Invalid bill amount' });
    }

    // Retrieve society late fee policy
    const society = await Society.findById(req.user.societyId);
    const lateFeeSettings = society?.lateFeeSettings || {
      ratePercentPerYear: 21,
      gracePeriodDays: 5,
      dueDateDay: 10,
    };

    // Calculate dynamic late fee if overdue
    const now = new Date();
    let lateFee = 0;
    if (bill.dueDate && now > new Date(bill.dueDate)) {
      const daysOverdue = Math.floor((now - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        lateFee = Math.round(
          calculateLateFee(
            bill.amount,
            lateFeeSettings.ratePercentPerYear,
            daysOverdue,
            lateFeeSettings.gracePeriodDays
          )
        );
      }
    }

    const totalAmountInPaise = bill.amount + lateFee;

    const options = {
      amount: totalAmountInPaise,
      currency: 'INR',
      receipt: `rcpt_${bill._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    // Update existing bill with razorpayOrderId and accrued late fee instead of creating an orphan record
    bill.razorpayOrderId = razorpayOrder.id;
    bill.lateFee = lateFee;
    bill.status = 'created';
    bill.updatedAt = Date.now();
    await bill.save();

    res.status(200).json({
      message: 'Order created successfully',
      orderId: razorpayOrder.id,
      amount: totalAmountInPaise,
      baseAmount: bill.amount,
      lateFee,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      paymentRecordId: bill._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while creating order' });
  }
};

// Verify a Razorpay payment after checkout completes
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, societyId: req.user.societyId },
        { status: 'failed', updatedAt: Date.now() }
      );
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, societyId: req.user.societyId },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: 'captured',
        updatedAt: Date.now(),
      },
      { returnDocument: 'after' }
    );

    if (!payment) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Ensure income Ledger entry is created if not already recorded
    const existingLedger = await Ledger.findOne({ referenceBillId: payment._id, type: 'income' });
    if (!existingLedger) {
      await Ledger.create({
        societyId: payment.societyId,
        type: 'income',
        category: 'Maintenance Bill',
        amountInPaise: payment.amount + (payment.lateFee || 0),
        paymentMethod: 'razorpay',
        referenceBillId: payment._id,
        description: `Online maintenance payment - Unit ${payment.unitNumber} (${payment.month})`,
        recordedBy: payment.residentId,
      });
    }

    res.status(200).json({ message: 'Payment verified successfully', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while verifying payment' });
  }
};

// Generate a new bill (SocietyOwner or Committee with manageBills permission creates a bill for a resident)
const generateBill = async (req, res) => {
  try {
    const { residentId, amount, unitNumber, month, dueDate } = req.body;

    if (!residentId || !amount || !unitNumber || !month || !dueDate) {
      return res.status(400).json({ message: 'Please provide all required fields: residentId, amount, unitNumber, month, dueDate' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // Atomic tenant scoping on resident retrieval
    const resident = await User.findOne({ _id: residentId, societyId: req.user.societyId });
    if (!resident) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const amountInPaise = Math.round(amount * 100);

    const bill = await Payment.create({
      societyId: req.user.societyId,
      residentId,
      amount: amountInPaise,
      lateFee: 0,
      currency: 'INR',
      unitNumber,
      month,
      dueDate: new Date(dueDate),
      status: 'created',
    });

    res.status(201).json({
      message: 'Bill generated successfully',
      bill: {
        id: bill._id,
        societyId: bill.societyId,
        residentId: bill.residentId,
        amount: bill.amount,
        lateFee: bill.lateFee,
        currency: bill.currency,
        unitNumber: bill.unitNumber,
        month: bill.month,
        dueDate: bill.dueDate,
        status: bill.status,
        createdAt: bill.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while generating bill' });
  }
};

// Get bills/payment history with strict tenant scoping and dynamic late fee accrual
const getBills = async (req, res) => {
  try {
    const query = { societyId: req.user.societyId };

    if (req.user.role === 'Resident') {
      query.residentId = req.user.id;
    } else if (req.user.role === 'SocietyOwner') {
      // SocietyOwner sees all bills for their society
    } else if (req.user.role === 'Committee') {
      if (!Array.isArray(req.user.permissions) || !req.user.permissions.includes('manageBills')) {
        return res.status(403).json({ message: 'Access denied. Missing required permission: manageBills' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    if (req.query.status) {
      const validStatuses = ['created', 'authorized', 'captured', 'failed'];
      if (validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
    }

    const society = await Society.findById(req.user.societyId);
    const lateFeeSettings = society?.lateFeeSettings || {
      ratePercentPerYear: 21,
      gracePeriodDays: 5,
      dueDateDay: 10,
    };

    const rawBills = await Payment.find(query).sort({ createdAt: -1 }).select('-__v');

    const now = new Date();
    const bills = rawBills.map((bill) => {
      const billObj = bill.toObject();
      let accruedLateFee = billObj.lateFee || 0;
      let daysOverdue = 0;

      if (billObj.status !== 'captured' && billObj.dueDate && now > new Date(billObj.dueDate)) {
        daysOverdue = Math.floor((now - new Date(billObj.dueDate)) / (1000 * 60 * 60 * 24));
        if (daysOverdue > 0) {
          accruedLateFee = Math.round(
            calculateLateFee(
              billObj.amount,
              lateFeeSettings.ratePercentPerYear,
              daysOverdue,
              lateFeeSettings.gracePeriodDays
            )
          );
        }
      }

      return {
        ...billObj,
        lateFee: accruedLateFee,
        daysOverdue: Math.max(0, daysOverdue),
        totalAmount: billObj.amount + accruedLateFee,
      };
    });

    res.status(200).json({ bills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching bills' });
  }
};

// Razorpay Webhook Handler
const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ message: 'Missing Razorpay signature header' });
    }

    const payload = req.rawBody ? req.rawBody : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status !== 'captured') {
        payment.status = 'captured';
        payment.razorpayPaymentId = paymentId;
        payment.updatedAt = Date.now();
        await payment.save();

        const existingLedger = await Ledger.findOne({ referenceBillId: payment._id, type: 'income' });
        if (!existingLedger) {
          await Ledger.create({
            societyId: payment.societyId,
            type: 'income',
            category: 'Maintenance Bill',
            amountInPaise: payment.amount + (payment.lateFee || 0),
            paymentMethod: 'razorpay',
            referenceBillId: payment._id,
            description: `Webhook maintenance collection - Unit ${payment.unitNumber} (${payment.month})`,
            recordedBy: payment.residentId,
          });
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Error handling Razorpay webhook:', err);
    res.status(500).json({ message: 'Server error processing webhook' });
  }
};

module.exports = { createOrder, verifyPayment, generateBill, getBills, handleRazorpayWebhook };