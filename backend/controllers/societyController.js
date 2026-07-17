const Society = require('../models/Society');

// Create a new society (SuperAdmin only)
const createSociety = async (req, res) => {
  try {
    const { name, address, city, registrationNumber } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ message: 'Name, address, and city are required' });
    }

    const newSociety = await Society.create({
      name,
      address,
      city,
      registrationNumber,
    });

    res.status(201).json({
      message: 'Society created successfully',
      society: newSociety,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while creating society' });
  }
};

// Get all societies (SuperAdmin only)
const getAllSocieties = async (req, res) => {
  try {
    const societies = await Society.find();
    res.status(200).json({ societies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching societies' });
  }
};

// Get a single society by ID (SuperAdmin or that society's SocietyAdmin)
const getSocietyById = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);

    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // If the requester is a SocietyAdmin, they can only view their own society
    if (req.user.role === 'SocietyAdmin' && req.user.societyId !== req.params.id) {
      return res.status(403).json({ message: 'Access denied to this society' });
    }

    res.status(200).json({ society });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching society' });
  }
};

module.exports = { createSociety, getAllSocieties, getSocietyById };
