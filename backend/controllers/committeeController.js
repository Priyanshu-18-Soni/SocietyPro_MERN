const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createCommittee = async (req, res) => {
  try {
    const { name, email, password, customLabel, permissions } = req.body;

    // Validate required fields
    if (!name || !email || !password || !customLabel) {
      return res.status(400).json({ message: 'Please provide name, email, password, and customLabel' });
    }

    // Validate permissions if provided
    if (permissions !== undefined && !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'permissions must be an array' });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the User with role: 'Committee', societyId from req.user.societyId
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'Committee',
      societyId: req.user.societyId,
      customLabel,
      permissions: permissions || [], // Default to empty array if not provided
    });

    // Return 201 with created committee member details (excluding passwordHash)
    res.status(201).json({
      message: 'Committee member created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        customLabel: user.customLabel,
        permissions: user.permissions,
        societyId: user.societyId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during committee creation' });
  }
};

const getCommitteeMembers = async (req, res) => {
  try {
    // Find all Committee members in the SocietyOwner's society
    const committeeMembers = await User.find({
      societyId: req.user.societyId,
      role: 'Committee'
    }).select('-passwordHash'); // Exclude passwordHash from results

    res.status(200).json({ committeeMembers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching committee members' });
  }
};

const updateCommitteePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { customLabel, permissions } = req.body;

    // Find the User by id and societyId (atomic tenant isolation)
    const user = await User.findOne({ _id: id, societyId: req.user.societyId });
    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Verify this user's role is actually 'Committee'
    if (user.role !== 'Committee') {
      return res.status(400).json({ message: 'Target user is not a Committee member' });
    }

    // Update customLabel and/or permissions from req.body (only update fields that were provided)
    if (customLabel !== undefined) {
      user.customLabel = customLabel;
    }
    if (permissions !== undefined) {
      // Validate permissions is an array
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'permissions must be an array' });
      }
      user.permissions = permissions;
    }

    // Save and return 200 with updated committee member details
    await user.save();
    res.status(200).json({
      message: 'Committee member updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        customLabel: user.customLabel,
        permissions: user.permissions,
        societyId: user.societyId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating committee member' });
  }
};

const deleteCommittee = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the User by id and societyId (atomic tenant isolation)
    const user = await User.findOne({ _id: id, societyId: req.user.societyId });
    if (!user) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Verify role is 'Committee'
    if (user.role !== 'Committee') {
      return res.status(400).json({ message: 'Target user is not a Committee member' });
    }

    // Delete the user
    await user.deleteOne();

    res.status(200).json({ message: 'Committee member removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting committee member' });
  }
};

module.exports = { createCommittee, getCommitteeMembers, updateCommitteePermissions, deleteCommittee };