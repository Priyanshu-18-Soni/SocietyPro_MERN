const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Payment = require('../models/Payment');

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

module.exports = { createOrder, verifyPayment };
