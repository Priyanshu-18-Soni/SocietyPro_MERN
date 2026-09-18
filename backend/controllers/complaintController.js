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

// Upvote an existing complaint by adding the resident's flat number to affectedFlats
const upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const voterFlat = req.user.flatNo || req.user.unitNumber || req.body.flatNo || 'Resident';

    const complaint = await Complaint.findOneAndUpdate(
      { _id: id, societyId: req.user.societyId },
      { $addToSet: { affectedFlats: voterFlat } },
      { returnDocument: 'after' }
    ).populate('createdBy', 'name email unitNumber role');

    if (!complaint) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({
      message: 'Complaint upvoted successfully',
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
