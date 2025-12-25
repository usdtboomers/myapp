const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Setting = require('../models/Setting'); // Settings model
const sanitizeUser = require('../utils/sanitizeUser');
const sendEmail = require('../utils/sendEmail');
const checkFeature = require('../middleware/checkFeatureEnabled'); // ✅ correct

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://178.128.20.53';
// 📌 Generate Unique User ID
const generateUserId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(100000 + Math.random() * 900000);
    exists = await User.exists({ userId: id });
  }
  return id;
};

// ====================== REGISTER ======================
router.post('/register', checkFeature('allowRegistrations'), async (req, res) => {
  try {
    const { name, mobile, email, country, password, txnPassword, sponsorId } = req.body;

    if (!name || !mobile || !email || !country || !password || !txnPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ message: 'Email or mobile already exists.' });

    const userId = await generateUserId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedTxnPassword = await bcrypt.hash(txnPassword, 10);

    const user = new User({
      userId,
      name,
      mobile,
      email,
      country,
      password: hashedPassword,
      transactionPassword: hashedTxnPassword,
      sponsorId: sponsorId ? parseInt(sponsorId) : undefined,
      role: 'user',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully.', userId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ====================== LOGIN ======================
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // 🔹 Fetch settings
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(500).json({ message: 'Settings not found' });
    }

    // 🔹 Find user
    const user = await User.findOne({ userId });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // 🚧 Maintenance check
    if (settings.maintenanceMode) {
      const whitelist = (settings.maintenanceWhitelist || []).map(String);
      const userIdStr = String(user.userId);
      if (!whitelist.includes(userIdStr) && user.role !== 'admin') {
        return res.status(503).json({
          message: 'Site is under maintenance. Please try later.',
        });
      }
    }

    // 🚫 Allow Login OFF check
    if (!settings.allowLogin && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Login is temporarily disabled in the System.',
      });
    }

    // 🔹 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // 🔹 Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({
        message:
          'This account has been temporarily restricted due to repeated policy violations or suspicious activity. Access has been disabled until further review by the administration team.',
      });
    }

    // 🔹 Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '50m' });

    // 🔹 Respond
    res.json({ message: 'Login successful', token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// ====================== FORGOT PASSWORD ======================
router.post('/forgot-password', checkFeature(), async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: '🔐 Password Reset Request',
      text: `Hello ${user.name},\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nThanks,\nApp Team`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2E86C1;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password. Click below:</p>
          <p style="text-align:center;">
            <a href="${resetLink}" style="padding:12px 24px;background:#2E86C1;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
          </p>
          <p>If button doesn't work, copy this link: <a href="${resetLink}">${resetLink}</a></p>
          <p>If you did not request this, ignore.</p>
        </div>
      `,
    });

    res.json({ message: '✅ Password reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// ====================== RESET PASSWORD ======================
router.post('/reset-password/:token', checkFeature(), async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
