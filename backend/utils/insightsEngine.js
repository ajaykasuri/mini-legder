// Turns raw transaction rows into human-readable insight strings.
// Kept pure (no DB/network calls) so it's easy to unit test on its own.

function sum(transactions) {
  return transactions.reduce((total, t) => total + Number(t.amount), 0);
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category_name] = (acc[t.category_name] || 0) + Number(t.amount);
    return acc;
  }, {});
}

/**
 * @param {Array} currentMonthExpenses  expense rows for the current calendar month
 * @param {Array} lastMonthExpenses     expense rows for the previous calendar month
 * @param {Array} currentWeekExpenses   expense rows for the trailing 7 days
 * @param {Array} priorWeeksAvgExpense  average weekly expense total over the prior weeks
 */
function generateInsights({
  currentMonthExpenses = [],
  lastMonthExpenses = [],
  currentWeekExpenses = [],
  priorWeeksAvgTotal = 0,
  currentMonthIncome = [],
  lastMonthIncome = [],
}) {
  const insights = [];

  const currentByCategory = groupByCategory(currentMonthExpenses);
  const lastByCategory = groupByCategory(lastMonthExpenses);
  const totalCurrentExpense = sum(currentMonthExpenses);
  const totalLastExpense = sum(lastMonthExpenses);

  // Per-category month-over-month change
  Object.entries(currentByCategory).forEach(([category, amount]) => {
    const lastAmount = lastByCategory[category] || 0;
    const change = percentChange(amount, lastAmount);
    if (lastAmount > 0 && Math.abs(change) >= 20) {
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push(
        `📈 ${category} spending ${direction} by ${Math.abs(Math.round(change))}% compared to last month.`
      );
    }
  });

  // Weekly spike vs. average
  const currentWeekTotal = sum(currentWeekExpenses);
  if (priorWeeksAvgTotal > 0 && currentWeekTotal >= priorWeeksAvgTotal * 1.5) {
    insights.push(
      `⚠️ This week's spending is ${(currentWeekTotal / priorWeeksAvgTotal).toFixed(1)}x your weekly average.`
    );
  }

  // Savings comparison (income - expense) vs last month
  const netCurrent = sum(currentMonthIncome) - totalCurrentExpense;
  const netLast = sum(lastMonthIncome) - totalLastExpense;
  if (netCurrent > netLast) {
    insights.push(`💰 You saved ₹${Math.round(netCurrent - netLast)} more than last month.`);
  }

  // Largest single expense this month
  if (currentMonthExpenses.length > 0) {
    const largest = currentMonthExpenses.reduce((max, t) =>
      Number(t.amount) > Number(max.amount) ? t : max
    );
    insights.push(`🔥 Largest expense this month: ${largest.description || largest.category_name} ₹${largest.amount}`);
  }

  // Largest category share of total spend
  const topCategory = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && totalCurrentExpense > 0) {
    const share = Math.round((topCategory[1] / totalCurrentExpense) * 100);
    if (share >= 25) {
      insights.push(`🍔 ${topCategory[0]} contributes ${share}% of all expenses this month.`);
    }
  }

  // Overall month-over-month trend
  const overallChange = percentChange(totalCurrentExpense, totalLastExpense);
  if (totalLastExpense > 0 && Math.abs(overallChange) >= 10) {
    const direction = overallChange > 0 ? 'increased' : 'decreased';
    insights.push(`📉 Your overall spending ${direction} by ${Math.abs(Math.round(overallChange))}% this month.`);
  }

  return insights;
}

module.exports = { generateInsights, percentChange, groupByCategory, sum };
