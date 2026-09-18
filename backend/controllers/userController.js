const User = require('../models/User');
const Society = require('../models/Society');

// Get all users/residents within the requester's own society (SocietyAdmin only)
const getSocietyUsers = async (req, res) => {
  try {
    const users = await User.find({ societyId: req.user.societyId }).select('-passwordHash');
    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// Get a single user by ID (must belong to the requester's own society)
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, societyId: req.user.societyId }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// Update a user's details (must belong to the requester's own society)
const updateUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, societyId: req.user.societyId });

    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const { name, unitNumber } = req.body;
    if (name) user.name = name;
    if (unitNumber) user.unitNumber = unitNumber;

    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

// Delete/remove a user (must belong to the requester's own society)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, societyId: req.user.societyId });

    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    await user.deleteOne();

    res.status(200).json({ message: 'User removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

// Set custom rate items for an individual resident - SocietyOwner or Committee with manageResidents
const setResidentCustomRate = async (req, res) => {
  try {
    const { rateItems } = req.body;

    if (!Array.isArray(rateItems)) {
      return res.status(400).json({ message: 'rateItems must be an array' });
    }

    const user = await User.findOne({ _id: req.params.id, societyId: req.user.societyId });
    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (user.role !== 'Resident') {
      return res.status(400).json({ message: 'Can only set custom rates for residents' });
    }

    if (rateItems.length === 0) {
      user.customRateItems = [];
      user.usingCustomRate = false;
    } else {
      for (let i = 0; i < rateItems.length; i++) {
        const item = rateItems[i];
        if (
          !item ||
          typeof item !== 'object' ||
          typeof item.name !== 'string' ||
          !item.name.trim() ||
          typeof item.amount !== 'number' ||
          isNaN(item.amount) ||
          item.amount <= 0
        ) {
          return res.status(400).json({
            message: 'Each rate item must have a non-empty name and a positive amount',
          });
        }
      }

      user.customRateItems = rateItems.map((item) => ({
        name: item.name.trim(),
        amount: item.amount,
        gstApplicable: Boolean(item.gstApplicable),
      }));
      user.usingCustomRate = true;
    }

    await user.save();

    res.status(200).json({
      message: user.usingCustomRate
        ? 'Resident custom rates updated successfully'
        : 'Resident rates reset to default successfully',
      user: {
        id: user._id,
        name: user.name,
        unitNumber: user.unitNumber,
        usingCustomRate: user.usingCustomRate,
        customRateItems: user.customRateItems,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while setting resident custom rate' });
  }
};

// Get the effective rate for a specific resident - manageResidents access or the resident themselves
const getResidentRate = async (req, res) => {
  try {
    const resident = await User.findOne({ _id: req.params.id, societyId: req.user.societyId });
    if (!resident) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const isOwner = req.user.role === 'SocietyOwner';
    const isPermittedCommittee =
      req.user.role === 'Committee' &&
      Array.isArray(req.user.permissions) &&
      req.user.permissions.includes('manageResidents');
    const isSelf = String(req.user.id) === String(resident._id);

    if (!isOwner && !isPermittedCommittee && !isSelf) {
      return res.status(403).json({ message: 'Access denied to this user' });
    }

    if (resident.usingCustomRate) {
      return res.status(200).json({
        source: 'custom',
        rateItems: resident.customRateItems,
      });
    }

    const society = await Society.findById(resident.societyId);
    return res.status(200).json({
      source: 'default',
      rateItems: society ? society.defaultRateItems : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching resident rate' });
  }
};

// Get all pending resident registrations for the tenant
const getPendingResidents = async (req, res) => {
  try {
    const pendingResidents = await User.find({
      societyId: req.user.societyId,
      role: 'Resident',
      status: 'pending',
    }).select('-passwordHash').sort({ createdAt: -1 });

    res.status(200).json({ pendingResidents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching pending residents' });
  }
};

// Approve a pending resident
const approveResident = async (req, res) => {
  try {
    const resident = await User.findOneAndUpdate(
      { _id: req.params.id, societyId: req.user.societyId, role: 'Resident' },
      { status: 'active' },
      { returnDocument: 'after' }
    ).select('-passwordHash');

    if (!resident) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({ message: 'Resident approved successfully', resident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while approving resident' });
  }
};

// Reject a pending resident
const rejectResident = async (req, res) => {
  try {
    const resident = await User.findOneAndUpdate(
      { _id: req.params.id, societyId: req.user.societyId, role: 'Resident' },
      { status: 'rejected' },
      { returnDocument: 'after' }
    ).select('-passwordHash');

    if (!resident) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json({ message: 'Resident rejected successfully', resident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while rejecting resident' });
  }
};

module.exports = {
  getSocietyUsers,
  getUserById,
  updateUser,
  deleteUser,
  setResidentCustomRate,
  getResidentRate,
  getPendingResidents,
  approveResident,
  rejectResident,
};
