const calculateLateFee = (amount, ratePercentPerYear, daysOverdue, gracePeriodDays) => {
  const chargeableDays = daysOverdue - gracePeriodDays;
  if (chargeableDays <= 0) return 0;
  const fee = (amount * ratePercentPerYear) / 365 / 100 * chargeableDays;
  return Math.round(fee * 100) / 100; // round to 2 decimal places
};

module.exports = calculateLateFee;
