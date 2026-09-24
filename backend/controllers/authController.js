const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Society = require('../models/Society');
const { generateUniqueSocietyCode } = require('../utils/generateSocietyCode');

const registerOwner = async (req, res) => {
  try {
    const { name, email, password, societyName, address, city, registrationNumber } = req.body;

    if (!name || !email || !password || !societyName || !address || !city) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const societyCode = await generateUniqueSocietyCode();
    const newUserId = new mongoose.Types.ObjectId();

    const society = await Society.create({
      name: societyName,
      address,
      city,
      registrationNumber: registrationNumber || '',
      societyCode,
      ownerId: newUserId,
    });

    const user = await User.create({
      _id: newUserId,
      name,
      email,
      passwordHash,
      role: 'SocietyOwner',
      societyId: society._id,
      status: 'active',
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, societyId: user.societyId, permissions: user.permissions, status: user.status },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Society and owner registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        societyId: user.societyId,
        status: user.status,
      },
      society: {
        id: society._id,
        name: society.name,
        societyCode: society.societyCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const registerResident = async (req, res) => {
  try {
    const { name, email, password, societyCode, unitNumber } = req.body;

    if (!name || !email || !password || !societyCode) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const society = await Society.findOne({ societyCode });
    if (!society) {
      return res.status(400).json({ message: 'Invalid society code — no matching society found' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'Resident',
      societyId: society._id,
      unitNumber: unitNumber || '',
      status: 'pending',
    });

    const token = jwt.sign(
      { 
        id: newUser._id, 
        role: newUser.role, 
        societyId: newUser.societyId, 
        permissions: newUser.permissions, 
        status: newUser.status,
        unitNumber: newUser.unitNumber 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Resident registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        societyId: newUser.societyId,
        unitNumber: newUser.unitNumber,
        status: newUser.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, 
        societyId: user.societyId, 
        permissions: user.permissions, 
        status: user.status,
        unitNumber: user.unitNumber 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        societyId: user.societyId,
        unitNumber: user.unitNumber,
        permissions: user.permissions || [],
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const checkStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is now active but the token was issued with pending status, refresh the token
    let freshToken = null;
    if (user.status === 'active' && req.user.status !== 'active') {
      freshToken = jwt.sign(
        {
          id: user._id,
          role: user.role,
          societyId: user.societyId,
          permissions: user.permissions,
          status: user.status,
          unitNumber: user.unitNumber,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    res.status(200).json({
      status: user.status,
      token: freshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        societyId: user.societyId,
        unitNumber: user.unitNumber,
        permissions: user.permissions || [],
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error checking status' });
  }
};

module.exports = { registerOwner, registerResident, loginUser, checkStatus };