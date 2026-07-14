const nodemailer = require('nodemailer');

// Lazily created so the app can still boot without SMTP configured
// (e.g. while developing other features) — email sends just no-op with
// a console warning instead of crashing the server.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.warn('SMTP not configured — skipping email:', subject);
    return;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || '"Mini Smart Ledger" <no-reply@ledger.local>',
      to,
      subject,
      text,
    });
  } catch (err) {
    // Same principle as the Discord notifier: a failed email should never
    // break the request that triggered it.
    console.error('Email send failed:', err.message);
  }
}

function spendingLockCooldownEmail({ to, categoryName, cooldownMinutes }) {
  return sendEmail({
    to,
    subject: `Security notice: ${categoryName} spending lock — 3 failed attempts`,
    text:
      `There were 3 failed password attempts to override your "${categoryName}" daily spending limit.\n\n` +
      `The override has been disabled for ${cooldownMinutes} minutes as a precaution.\n\n` +
      `If this wasn't you, we'd recommend changing your password.`,
  });
}

module.exports = { sendEmail, spendingLockCooldownEmail };
