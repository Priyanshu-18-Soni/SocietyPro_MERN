const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['SocietyOwner', 'Committee', 'Resident'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'active',
    index: true,
  },
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true,
  },
  customLabel: {
    type: String,
    required: false,
  },
  permissions: {
    type: [String],
    default: [],
  },
  unitNumber: {
    type: String,
  },
  customRateItems: {
    type: [{
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      gstApplicable: { type: Boolean, default: false },
    }],
    default: [],
  },
  usingCustomRate: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ societyId: 1, role: 1 });
userSchema.index({ societyId: 1, role: 1, status: 1 });
userSchema.index({ societyId: 1, unitNumber: 1 });

module.exports = mongoose.model('User', userSchema);