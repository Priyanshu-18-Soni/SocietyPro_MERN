const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    isPriority: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

noticeSchema.index({ societyId: 1, isPriority: -1, createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
