const mongoose = require('mongoose');
const Ledger = require('../models/Ledger');

// Record a manual expense in the society treasury ledger
const recordExpense = async (req, res) => {
  try {
    const { category, amount, paymentMethod, description, date } = req.body;

    if (!category || !amount || !paymentMethod || !description) {
      return res.status(400).json({
        message: 'Please provide all required fields: category, amount, paymentMethod, description',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number in Rupees' });
    }

    const validMethods = ['razorpay', 'cash', 'cheque', 'bank_transfer'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `paymentMethod must be one of: ${validMethods.join(', ')}`,
      });
    }

    // Convert Rupees to integer Paise per absolute financial rules
    const amountInPaise = Math.round(numAmount * 100);

    const expense = await Ledger.create({
      societyId: req.user.societyId,
      type: 'expense',
      category: category.trim(),
      amountInPaise,
      paymentMethod,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      recordedBy: req.user.id,
    });

    res.status(201).json({
      message: 'Expense recorded successfully',
      expense,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while recording expense' });
  }
};

// Retrieve financial treasury metrics and recent transactions via MongoDB $facet pipeline
const getFinancialMetrics = async (req, res) => {
  try {
    const societyId = new mongoose.Types.ObjectId(req.user.societyId);

    const [aggregationResult] = await Ledger.aggregate([
      { $match: { societyId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalIncomeInPaise: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'income'] }, '$amountInPaise', 0],
                  },
                },
                totalExpenseInPaise: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'expense'] }, '$amountInPaise', 0],
                  },
                },
                totalTransactions: { $sum: 1 },
              },
            },
          ],
          recentEntries: [
            { $sort: { date: -1, createdAt: -1 } },
            { $limit: 50 },
            {
              $lookup: {
                from: 'users',
                localField: 'recordedBy',
                foreignField: '_id',
                as: 'recordedBy',
              },
            },
            {
              $unwind: {
                path: '$recordedBy',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                amountInRupees: { $divide: ['$amountInPaise', 100] },
                'recordedBy.id': '$recordedBy._id',
              },
            },
            {
              $project: {
                'recordedBy.passwordHash': 0,
              },
            },
          ],
        },
      },
    ]);

    const summary = aggregationResult?.totals?.[0] || {
      totalIncomeInPaise: 0,
      totalExpenseInPaise: 0,
      totalTransactions: 0,
    };

    const totalIncomeInPaise = summary.totalIncomeInPaise || 0;
    const totalExpenseInPaise = summary.totalExpenseInPaise || 0;
    const netBalanceInPaise = totalIncomeInPaise - totalExpenseInPaise;
    const totalTransactions = summary.totalTransactions || 0;
    const entries = aggregationResult?.recentEntries || [];

    res.status(200).json({
      metrics: {
        totalIncomeInPaise,
        totalExpenseInPaise,
        netBalanceInPaise,
        totalIncome: totalIncomeInPaise / 100,
        totalExpense: totalExpenseInPaise / 100,
        netBalance: netBalanceInPaise / 100,
        totalTransactions,
      },
      entries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching financial metrics' });
  }
};

module.exports = {
  recordExpense,
  getFinancialMetrics,
};
