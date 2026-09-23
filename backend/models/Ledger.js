const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cash', 'cheque', 'bank_transfer'],
      required: true,
    },
    referenceBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index for bill ledger entries preventing duplicate credit without colliding manual entries
ledgerSchema.index(
  { referenceBillId: 1, type: 1 },
  { unique: true, partialFilterExpression: { referenceBillId: { $type: 'objectId' } } }
);

// Essential database query indexes
ledgerSchema.index({ societyId: 1, date: -1, createdAt: -1 });
ledgerSchema.index({ societyId: 1, type: 1, date: -1 });

// Virtual getter to convert integer Paise to Rupees for client views
ledgerSchema.virtual('amountInRupees').get(function () {
  return this.amountInPaise / 100;
});

module.exports = mongoose.model('Ledger', ledgerSchema);
