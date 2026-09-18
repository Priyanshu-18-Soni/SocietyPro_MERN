const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    flatNo: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    affectedFlats: {
      type: [{ type: String }],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    verdict: {
      type: String,
      enum: ['pending', 'confirmed', 'reopened'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

complaintSchema.index({ societyId: 1, status: 1, createdAt: -1 });
complaintSchema.index({ societyId: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
