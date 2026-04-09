const express = require('express');
const router = express.Router();
// bcryptjs hata diya hai kyunki ab normal password chahiye
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Setting = require('../models/Setting'); 
const sanitizeUser = require('../utils/sanitizeUser');
const sendEmail = require('../utils/sendEmail');
const checkFeature = require('../middleware/checkFeatureEnabled');

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://178.128.20.53';

// 📌 Generate Unique User ID
const generateUserId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(1000000 + Math.random() * 9000000);
    exists = await User.exists({ userId: id });
  }
  return id;
};

// ====================== REGISTER ======================
router.post('/register', checkFeature('allowRegistrations'), async (req, res) => {
  try {
    const { name, mobile, email, country, password, sponsorId } = req.body;

    // ✅ CHECK 1: Sponsor ID is mandatory
    if (!sponsorId) {
      return res.status(400).json({ message: 'Sponsor ID is compulsory to register.' });
    }

    // ✅ CHECK 2: Validate Sponsor ID exists in database
    const sponsorExists = await User.findOne({ userId: parseInt(sponsorId) });
    if (!sponsorExists) {
        return res.status(400).json({ message: 'Invalid Sponsor ID. Sponsor not found in the system.' });
    }

    if (!name || !mobile || !email || !country || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password === '123456') {
      return res.status(400).json({ message: 'Password is too weak. Please choose a stronger password.' });
    }

    // ✅ CHECK 3: Pre-check for duplicate Email or Mobile to give clear message
    const existingUser = await User.findOne({ $or: [{ email: email }, { mobile: mobile }] });
    if (existingUser) {
        if (existingUser.mobile === mobile) {
            return res.status(400).json({ message: 'This mobile number is already registered.' });
        }
        if (existingUser.email === email) {
            return res.status(400).json({ message: 'This email is already registered.' });
        }
    }

    const userId = await generateUserId();
    
    // ✅ Seedha normal password save kar rahe hain bina hash kiye
    const user = new User({
      userId,
      name,
      mobile,
      email,
      country,
      password: password, // Plain text
      transactionPassword: password, // Plain text
      sponsorId: parseInt(sponsorId),
      role: 'user',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully.', userId });
  } catch (err) {
    console.error('Register error:', err);

    // 🛑 Duplicate Key Error Handler (Mongo E11000) fail-safe
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0]; // Ye 'mobile' ya 'email' batayega
      return res.status(400).json({ message: `The ${field} is already registered. Please use another ${field}.` });
    }

    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ====================== LOGIN ======================
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(500).json({ message: 'Settings not found' });
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Maintenance check
    if (settings.maintenanceMode) {
      const whitelist = (settings.maintenanceWhitelist || []).map(String);
      const userIdStr = String(user.userId);
      if (!whitelist.includes(userIdStr) && user.role !== 'admin') {
        return res.status(503).json({
          message: 'Site is under maintenance. Please try later.',
        });
      }
    }

    // Allow Login OFF check
    if (!settings.allowLogin && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Login is temporarily disabled in the System.',
      });
    }

    // ✅ Normal Text Password Comparison
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: 'This account has been temporarily restricted due to policy violations.',
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '50m' });

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
      email: user.email,
      subject: '🔐 Password Reset Request',
      message: `Reset Link: ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2E86C1;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password. Click below:</p>
          <p style="text-align:center;">
            <a href="${resetLink}" style="padding:12px 24px;background:#2E86C1;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
          </p>
          <p>This link expires in 1 hour.</p>
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

    // ✅ Normal text password save kar rahe hain reset ke time bhi
    user.password = newPassword;          
    user.transactionPassword = newPassword; 

    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: 'Password and Transaction Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;