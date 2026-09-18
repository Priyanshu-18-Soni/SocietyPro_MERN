const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  registrationNumber: {
    type: String,
  },
  societyCode: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  defaultRateItems: {
    type: [{
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      gstApplicable: { type: Boolean, default: false },
    }],
    default: [],
  },
  lateFeeSettings: {
    ratePercentPerYear: { type: Number, default: 21 },
    gracePeriodDays: { type: Number, default: 5 },
    dueDateDay: { type: Number, default: 10 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Society', societySchema);