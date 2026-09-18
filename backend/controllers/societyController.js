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

// Update default rate items for the society - SocietyOwner only
const updateDefaultRates = async (req, res) => {
  try {
    const { rateItems } = req.body;

    if (!Array.isArray(rateItems)) {
      return res.status(400).json({ message: 'rateItems must be an array' });
    }

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

    const society = await Society.findById(req.user.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    society.defaultRateItems = rateItems.map((item) => ({
      name: item.name.trim(),
      amount: item.amount,
      gstApplicable: Boolean(item.gstApplicable),
    }));

    await society.save();

    res.status(200).json({
      message: 'Default rates updated successfully',
      defaultRateItems: society.defaultRateItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating default rates' });
  }
};

// Get default rate items for the society - Accessible to any authenticated user in the society
const getDefaultRates = async (req, res) => {
  try {
    const society = await Society.findById(req.user.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    res.status(200).json({ defaultRateItems: society.defaultRateItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching default rates' });
  }
};

// Update late fee settings for the society - SocietyOwner only
const updateLateFeeSettings = async (req, res) => {
  try {
    const { ratePercentPerYear, gracePeriodDays, dueDateDay } = req.body;

    if (
      ratePercentPerYear !== undefined &&
      (typeof ratePercentPerYear !== 'number' ||
        isNaN(ratePercentPerYear) ||
        ratePercentPerYear <= 0 ||
        ratePercentPerYear > 100)
    ) {
      return res.status(400).json({
        message: 'ratePercentPerYear must be a positive number between 0 and 100',
      });
    }

    if (
      gracePeriodDays !== undefined &&
      (typeof gracePeriodDays !== 'number' ||
        !Number.isInteger(gracePeriodDays) ||
        gracePeriodDays < 0)
    ) {
      return res.status(400).json({
        message: 'gracePeriodDays must be a non-negative integer',
      });
    }

    if (
      dueDateDay !== undefined &&
      (typeof dueDateDay !== 'number' ||
        !Number.isInteger(dueDateDay) ||
        dueDateDay < 1 ||
        dueDateDay > 28)
    ) {
      return res.status(400).json({
        message: 'dueDateDay must be an integer between 1 and 28',
      });
    }

    if (
      ratePercentPerYear === undefined &&
      gracePeriodDays === undefined &&
      dueDateDay === undefined
    ) {
      return res.status(400).json({
        message: 'At least one late fee setting must be provided',
      });
    }

    const society = await Society.findById(req.user.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    if (!society.lateFeeSettings) {
      society.lateFeeSettings = {
        ratePercentPerYear: 21,
        gracePeriodDays: 5,
        dueDateDay: 10,
      };
    }

    if (ratePercentPerYear !== undefined) {
      society.lateFeeSettings.ratePercentPerYear = ratePercentPerYear;
    }
    if (gracePeriodDays !== undefined) {
      society.lateFeeSettings.gracePeriodDays = gracePeriodDays;
    }
    if (dueDateDay !== undefined) {
      society.lateFeeSettings.dueDateDay = dueDateDay;
    }

    await society.save();

    res.status(200).json({
      message: 'Late payment settings updated successfully',
      lateFeeSettings: society.lateFeeSettings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating late fee settings' });
  }
};

// Get late fee settings for the society - Accessible to any authenticated user in the society
const getLateFeeSettings = async (req, res) => {
  try {
    const society = await Society.findById(req.user.societyId);
    if (!society) {
      return res.status(404).json({ message: 'Society not found' });
    }

    const lateFeeSettings = society.lateFeeSettings || {
      ratePercentPerYear: 21,
      gracePeriodDays: 5,
      dueDateDay: 10,
    };

    res.status(200).json({ lateFeeSettings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching late fee settings' });
  }
};

module.exports = {
  getSocietyById,
  updateSociety,
  deleteSociety,
  updateDefaultRates,
  getDefaultRates,
  updateLateFeeSettings,
  getLateFeeSettings,
};