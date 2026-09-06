const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Create a Razorpay order (Resident initiates a payment)
const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const resident = await User.findById(req.user.id);
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    const amountInPaise = Math.round(amount * 100);
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const paymentDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    const payment = await Payment.create({
      societyId: req.user.societyId,
      residentId: req.user.id,
      amount: amountInPaise,
      currency: 'INR',
      unitNumber: resident.unitNumber || 'N/A',
      month: currentMonth,
      dueDate: paymentDueDate,
      razorpayOrderId: razorpayOrder.id,
      status: 'created',
    });

    res.status(201).json({
      message: 'Order created successfully',
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      paymentRecordId: payment._id,
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
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', updatedAt: Date.now() }
      );
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: 'captured',
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
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

    const resident = await User.findById(residentId);
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    if (String(resident.societyId) !== String(req.user.societyId)) {
      return res.status(403).json({ message: 'Access denied: resident belongs to a different society' });
    }

    const amountInPaise = Math.round(amount * 100);

    const bill = await Payment.create({
      societyId: req.user.societyId,
      residentId,
      amount: amountInPaise,
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
        currency: bill.currency,
        unitNumber: bill.unitNumber,
        month: bill.month,
        dueDate: bill.dueDate,
        status: bill.status,
        createdAt: bill.createdAt
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while generating bill' });
  }
};

// Get bills/payment history with role-based filtering
const getBills = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'Resident') {
      query.residentId = req.user.id;
    } else if (req.user.role === 'SocietyOwner') {
      query.societyId = req.user.societyId;
    } else if (req.user.role === 'Committee') {
      if (Array.isArray(req.user.permissions) && req.user.permissions.includes('manageBills')) {
        query.societyId = req.user.societyId;
      } else {
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

    const bills = await Payment.find(query).sort({ createdAt: -1 }).select('-__v');

    res.status(200).json({ bills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching bills' });
  }
};

module.exports = { createOrder, verifyPayment, generateBill, getBills };