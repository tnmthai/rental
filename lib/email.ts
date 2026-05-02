import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'info@rentfinder.nz';
const SITE_URL = (process.env.NEXTAUTH_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

function getTransport() {
  if (!SMTP_HOST) {
    throw new Error('SMTP_HOST is not configured');
  }

  const transportOptions: any = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE
  };

  if (SMTP_USER) {
    transportOptions.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS
    };
  }

  return nodemailer.createTransport(transportOptions);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const transport = getTransport();
  const resetUrl = `${SITE_URL}/reset-password/${token}`;
  const subject = 'RentFinder NZ password reset';

  const text = `We received a request to reset your RentFinder NZ password.\n\nClick the link below to choose a new password:\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this message.`;
  const html = `
    <p>We received a request to reset your RentFinder NZ password.</p>
    <p><a href="${resetUrl}" target="_blank" rel="noreferrer">Reset your password</a></p>
    <p>If the link does not work, copy and paste the following URL into your browser:</p>
    <p><a href="${resetUrl}" target="_blank" rel="noreferrer">${resetUrl}</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  await transport.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html
  });
}
