const Notice = require('../models/Notice');

// Get all notices for the tenant, sorted with priority first
const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ societyId: req.user.societyId })
      .populate('createdBy', 'name email role')
      .sort({ isPriority: -1, createdAt: -1 });

    res.status(200).json({ notices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching notices' });
  }
};

// Create a new notice (SocietyOwner or Committee with manageNotices)
const createNotice = async (req, res) => {
  try {
    const { title, body, isPriority } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const notice = await Notice.create({
      societyId: req.user.societyId,
      createdBy: req.user.id,
      title: title.trim(),
      body: body.trim(),
      isPriority: Boolean(isPriority),
    });

    res.status(201).json({
      message: 'Notice broadcasted successfully',
      notice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating notice' });
  }
};

// Toggle pin status of a notice for the authenticated user
const togglePinNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findOne({ _id: id, societyId: req.user.societyId });
    if (!notice) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const userIdStr = req.user.id.toString();
    const isPinned = notice.pinnedBy.some((uid) => uid.toString() === userIdStr);

    if (isPinned) {
      notice.pinnedBy = notice.pinnedBy.filter((uid) => uid.toString() !== userIdStr);
    } else {
      notice.pinnedBy.push(req.user.id);
    }

    await notice.save();

    res.status(200).json({
      message: isPinned ? 'Notice unpinned' : 'Notice pinned to your board',
      notice,
      isPinned: !isPinned,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error toggling pin on notice' });
  }
};

// Delete a notice (SocietyOwner or Committee with manageNotices)
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findOneAndDelete({ _id: id, societyId: req.user.societyId });
    if (!notice) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({ message: 'Notice removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting notice' });
  }
};

module.exports = {
  getNotices,
  createNotice,
  togglePinNotice,
  deleteNotice,
};
