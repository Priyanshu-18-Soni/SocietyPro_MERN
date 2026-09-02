const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Create a Razorpay order (Resident initiates a payment)
const createOrder = async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees (not paise) from frontend

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const amountInPaise = Math.round(amount * 100);

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

// Generate a new bill (SocietyAdmin creates a bill for a resident)
const generateBill = async (req, res) => {
  try {
    const { residentId, amount, unitNumber, month, dueDate } = req.body;

    // Validate all required fields
    if (!residentId || !amount || !unitNumber || !month || !dueDate) {
      return res.status(400).json({ message: 'Please provide all required fields: residentId, amount, unitNumber, month, dueDate' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // Find the resident and verify they belong to the SocietyAdmin's society
    const resident = await User.findById(residentId);
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    // Check if resident belongs to the same society as the SocietyAdmin
    if (String(resident.societyId) !== String(req.user.societyId)) {
      return res.status(403).json({ message: 'Access denied: resident belongs to a different society' });
    }

    // Convert amount from rupees to paise (consistent with createOrder)
    const amountInPaise = Math.round(amount * 100);

    // Create the bill (payment record with status 'created')
    const bill = await Payment.create({
      societyId: req.user.societyId,
      residentId,
      amount: amountInPaise,
      currency: 'INR',
      unitNumber,
      month,
      dueDate: new Date(dueDate), // Ensure it's a Date object
      status: 'created'
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
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while generating bill' });
  }
};

// Get bills/payment history with role-based filtering and optional status filter
const getBills = async (req, res) => {
  try {
    // Build base query based on user role
    let query = {};
    if (req.user.role === 'Resident') {
      // Residents can only see their own bills
      query.residentId = req.user.id;
    } else if (req.user.role === 'SocietyAdmin') {
      // SocietyAdmins can see all bills in their society
      query.societyId = req.user.societyId;
    } else {
      // SuperAdmins might want to see all bills, but for now restrict to their society if they have one
      // or return empty if they don't belong to a society
      if (req.user.societyId) {
        query.societyId = req.user.societyId;
      } else {
        // SuperAdmin without society sees nothing (or could be changed to see all)
        return res.status(200).json({ bills: [] });
      }
    }

    // Add status filter if provided
    if (req.query.status) {
      const validStatuses = ['created', 'authorized', 'captured', 'failed'];
      if (validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
      // If invalid status is provided, we ignore it (could also return 400)
    }

    // Find bills with sorting (newest first)
    const bills = await Payment.find(query)
      .sort({ createdAt: -1 })
      .select('-__v'); // Exclude version key

    res.status(200).json({ bills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching bills' });
  }
};

module.exports = { createOrder, verifyPayment, generateBill, getBills };
