const User = require('../models/User');

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
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user.societyId) !== String(req.user.societyId)) {
      return res.status(403).json({ message: 'Access denied to this user' });
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user.societyId) !== String(req.user.societyId)) {
      return res.status(403).json({ message: 'Access denied to this user' });
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user.societyId) !== String(req.user.societyId)) {
      return res.status(403).json({ message: 'Access denied to this user' });
    }

    await user.deleteOne();

    res.status(200).json({ message: 'User removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

module.exports = { getSocietyUsers, getUserById, updateUser, deleteUser };
