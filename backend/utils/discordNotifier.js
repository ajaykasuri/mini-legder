const axios = require('axios');

// Notifications are intentionally isolated behind this one function.
// Swapping Discord for Nodemailer/email, Slack, etc. later only means
// rewriting sendNotification's internals -- callers never change.
async function sendNotification({ title, description, fields = [], color = 0x2f6f5e }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not set — skipping notification:', title);
    return;
  }

  const embed = {
    title,
    description,
    color,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
  } catch (err) {
    // A failed notification should never break the request that triggered it
    // (e.g. adding a transaction). Log and move on.
    console.error('Discord notification failed:', err.message);
  }
}

function budgetAlertNotification({ categoryName, spent, limit, percentUsed }) {
  const exceeded = percentUsed >= 100;
  return sendNotification({
    title: exceeded ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
    description: `${categoryName} budget is ${Math.round(percentUsed)}% used.`,
    color: exceeded ? 0xc1584b : 0xe0a339,
    fields: [
      { name: 'Category', value: categoryName, inline: true },
      { name: 'Spent', value: `₹${spent}`, inline: true },
      { name: 'Budget', value: `₹${limit}`, inline: true },
    ],
  });
}

function largeTransactionNotification({ amount, description, categoryName }) {
  return sendNotification({
    title: '💸 Large Transaction Added',
    description: description || 'No description provided',
    color: 0x2f6f5e,
    fields: [
      { name: 'Amount', value: `₹${amount}`, inline: true },
      { name: 'Category', value: categoryName, inline: true },
    ],
  });
}

module.exports = { sendNotification, budgetAlertNotification, largeTransactionNotification };
