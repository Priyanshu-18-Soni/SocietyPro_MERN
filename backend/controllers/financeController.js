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

// Retrieve financial treasury metrics and recent transactions
const getFinancialMetrics = async (req, res) => {
  try {
    const entries = await Ledger.find({ societyId: req.user.societyId })
      .populate('recordedBy', 'name email role')
      .sort({ date: -1, createdAt: -1 });

    let totalIncomeInPaise = 0;
    let totalExpenseInPaise = 0;

    for (const entry of entries) {
      if (entry.type === 'income') {
        totalIncomeInPaise += entry.amountInPaise;
      } else if (entry.type === 'expense') {
        totalExpenseInPaise += entry.amountInPaise;
      }
    }

    const netBalanceInPaise = totalIncomeInPaise - totalExpenseInPaise;

    res.status(200).json({
      metrics: {
        totalIncomeInPaise,
        totalExpenseInPaise,
        netBalanceInPaise,
        totalIncome: totalIncomeInPaise / 100,
        totalExpense: totalExpenseInPaise / 100,
        netBalance: netBalanceInPaise / 100,
        totalTransactions: entries.length,
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
