const Society = require('../models/Society');

// Get a single society by ID - SocietyOwner can view their own society
const getSocietyById = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);

    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // SocietyOwner can only view their own society
    if (req.user.role === 'SocietyOwner' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only view your own society.' });
    }

    // For Committee members, they would need specific permissions checked by requirePermission middleware
    // But since we're using requirePermission('manageSociety') in the route, we assume they've passed that check
    // However, we should still ensure they can only access their own society for consistency
    if (req.user.role === 'Committee' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only view your own society.' });
    }

    res.status(200).json({ society });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching society' });
  }
};

// Update a society's details - SocietyOwner can update their own society
const updateSociety = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);

    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // SocietyOwner can only update their own society
    if (req.user.role === 'SocietyOwner' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own society.' });
    }

    // Committee members would need specific permissions checked by requirePermission middleware
    // But we still enforce society ownership for consistency
    if (req.user.role === 'Committee' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own society.' });
    }

    const { name, address, city, registrationNumber } = req.body;
    if (name) society.name = name;
    if (address) society.address = address;
    if (city) society.city = city;
    if (registrationNumber) society.registrationNumber = registrationNumber;

    await society.save();

    res.status(200).json({ message: 'Society updated successfully', society });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating society' });
  }
};

// Delete a society - SocietyOwner can delete their own society
const deleteSociety = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);

    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    // SocietyOwner can only delete their own society
    if (req.user.role === 'SocietyOwner' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own society.' });
    }

    // Committee members would need specific permissions checked by requirePermission middleware
    // But we still enforce society ownership for consistency
    if (req.user.role === 'Committee' && req.user.societyId.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own society.' });
    }

    await society.deleteOne();

    res.status(200).json({ message: 'Society deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while deleting society' });
  }
};

module.exports = { getSocietyById, updateSociety, deleteSociety };