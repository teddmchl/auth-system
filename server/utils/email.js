const nodemailer = require("nodemailer");

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendEmail = async (options) => {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"AuthSystem" <${process.env.EMAIL_FROM || "noreply@authsystem.dev"}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};

const sendPasswordResetEmail = async (email, token, name) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  
  const html = `
    <h1>Password Reset</h1>
    <p>Hi ${name},</p>
    <p>You requested a password reset. Please click the link below to set a new password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>If you didn't request this, ignore this email.</p>
  `;

  await sendEmail({
    to: email,
    subject: "Reset your password",
    html,
    text: `Hi ${name},\n\nYou requested a password reset. Link: ${resetUrl}`,
  });
};

const sendVerificationEmail = async (email, token, name) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  
  const html = `
    <h1>Verify your email</h1>
    <p>Hi ${name},</p>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verifyUrl}">${verifyUrl}</a>
    <p>This link will expire in 24 hours.</p>
  `;

  await sendEmail({
    to: email,
    subject: "Verify your email - AUTH/SYS",
    html,
    text: `Hi ${name},\n\nPlease verify your email: ${verifyUrl}`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
