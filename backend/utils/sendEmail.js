require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter;

const createTransporter = () => {
  console.log("---------------------------------------------------");
  console.log("📧 DEBUG: Email Logic Triggered");
  console.log("👤 User:", process.env.EMAIL_USER || "❌ MISSING");
  console.log("---------------------------------------------------");

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      family: 4, // 👈 YEH WALI LINE IMPORTANT HAI
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"Elite Infinity Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Send email error:', err);
    throw err;
  }
};

module.exports = sendEmail;