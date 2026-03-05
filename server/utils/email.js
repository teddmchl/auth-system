const nodemailer = require("nodemailer");

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

/**
 * Send a password reset email.
 * @param {string} to - Recipient email address
 * @param {string} resetToken - The raw reset token (not hashed)
 * @param {string} userName - Recipient's display name
 */
const sendPasswordResetEmail = async (to, resetToken, userName) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"AuthSystem" <${process.env.EMAIL_FROM || "noreply@authsystem.dev"}>`,
    to,
    subject: "Reset your password",
    text: `
Hi ${userName},

You requested a password reset. Use the link below — it expires in 1 hour.

${resetUrl}

If you didn't request this, you can safely ignore this email.

— AuthSystem
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; background: #f5f5f4; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e0ddd8; padding: 40px; }
    .logo { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-bottom: 32px; }
    h1 { font-size: 18px; font-weight: 700; color: #0a0a0a; margin: 0 0 16px; }
    p { font-size: 14px; color: #444; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 13px; letter-spacing: 0.04em; }
    .note { font-size: 12px; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
    .token { font-size: 11px; color: #aaa; word-break: break-all; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AuthSystem / Password Reset</div>
    <h1>Reset your password</h1>
    <p>Hi ${userName}, you requested a password reset. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    <div class="note">
      If you didn't request this, ignore this email — your password won't change.
    </div>
    <div class="token">If the button doesn't work: ${resetUrl}</div>
  </div>
</body>
</html>
    `.trim(),
  });
};

module.exports = { sendPasswordResetEmail };
