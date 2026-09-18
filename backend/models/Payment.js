const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  lateFee: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed'],
    default: 'created',
  },
  unitNumber: {
    type: String,
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ societyId: 1, residentId: 1, createdAt: -1 });
paymentSchema.index({ societyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
