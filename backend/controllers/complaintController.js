const Complaint = require('../models/Complaint');

// Create a new complaint ticket
const createComplaint = async (req, res) => {
  try {
    const { title, description, imageUrl, flatNo } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const residentFlat = req.user.flatNo || req.user.unitNumber || flatNo || 'N/A';

    const complaint = await Complaint.create({
      societyId: req.user.societyId,
      createdBy: req.user.id,
      flatNo: residentFlat,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl || null,
      affectedFlats: [residentFlat],
      status: 'open',
      verdict: 'pending',
    });

    res.status(201).json({
      message: 'Complaint filed successfully',
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error filing complaint' });
  }
};

// Get all complaints for the authenticated tenant
const getComplaints = async (req, res) => {
  try {
    const query = { societyId: req.user.societyId };

    if (req.query.status) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
    }

    const complaints = await Complaint.find(query)
      .populate('createdBy', 'name email unitNumber role')
      .sort({ createdAt: -1 });

    res.status(200).json({ complaints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching complaints' });
  }
};

// Upvote an existing complaint (toggle user ID in upvotedBy, update upvoteCount and affectedFlats)
const upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const voterFlat = req.user.flatNo || req.user.unitNumber || req.body.flatNo || 'Resident';

    const complaint = await Complaint.findOne({ _id: id, societyId: req.user.societyId });
    if (!complaint) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const hasUpvoted = complaint.upvotedBy && complaint.upvotedBy.some((uid) => uid.toString() === userId.toString());

    if (hasUpvoted) {
      complaint.upvotedBy = complaint.upvotedBy.filter((uid) => uid.toString() !== userId.toString());
      complaint.upvoteCount = Math.max(0, (complaint.upvoteCount || 1) - 1);
      // Remove flat if no other upvote from this flat
      if (complaint.affectedFlats) {
        complaint.affectedFlats = complaint.affectedFlats.filter((f) => f !== voterFlat);
      }
    } else {
      if (!complaint.upvotedBy) complaint.upvotedBy = [];
      complaint.upvotedBy.push(userId);
      complaint.upvoteCount = (complaint.upvoteCount || 0) + 1;
      if (!complaint.affectedFlats) complaint.affectedFlats = [];
      if (!complaint.affectedFlats.includes(voterFlat)) {
        complaint.affectedFlats.push(voterFlat);
      }
    }

    await complaint.save();
    await complaint.populate('createdBy', 'name email unitNumber role');

    res.status(200).json({
      message: hasUpvoted ? 'Upvote removed' : 'Complaint upvoted successfully',
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error upvoting complaint' });
  }
};

// Update status of a complaint (SocietyOwner or Committee with resolveComplaints)
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const complaint = await Complaint.findOneAndUpdate(
      { _id: id, societyId: req.user.societyId },
      { status },
      { returnDocument: 'after' }
    ).populate('createdBy', 'name email unitNumber role');

    if (!complaint) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({
      message: 'Complaint status updated successfully',
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating complaint status' });
  }
};

// Update verdict of a complaint (Ticket creator only)
const updateComplaintVerdict = async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict } = req.body;

    if (!verdict || !['confirmed', 'reopened'].includes(verdict)) {
      return res.status(400).json({ message: "Verdict must be either 'confirmed' or 'reopened'" });
    }

    const complaint = await Complaint.findOne({ _id: id, societyId: req.user.societyId });
    if (!complaint) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Must be the original creator
    if (complaint.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied: Only the ticket creator can submit a verdict' });
    }

    complaint.verdict = verdict;
    if (verdict === 'confirmed') {
      complaint.status = 'closed';
    } else if (verdict === 'reopened') {
      complaint.status = 'open';
    }

    await complaint.save();

    res.status(200).json({
      message: `Complaint verdict set to ${verdict}`,
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting verdict' });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  upvoteComplaint,
  updateComplaintStatus,
  updateComplaintVerdict,
};
