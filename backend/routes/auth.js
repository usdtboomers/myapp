require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Setting = require('../models/Setting'); 
const sanitizeUser = require('../utils/sanitizeUser');
const sendEmail = require('../utils/sendEmail');
const checkFeature = require('../middleware/checkFeatureEnabled');
const DummyUser = require('../models/DummyUser.js');
const LoginHistory = require('../models/LoginHistory'); 
const { bot } = require('../utils/telegramBot');

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://178.128.20.53';

// 📌 Helper: Get Real IP Address
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
};

// 📌 Generate Unique User ID
const generateUserId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(1000000 + Math.random() * 9000000);
    const existsInReal = await User.exists({ userId: id });
    const existsInDummy = await DummyUser.exists({ userId: id });
    if (!existsInReal && !existsInDummy) {
      exists = false;
    }
  }
  return id;
};

// ====================== REGISTER ======================
router.post('/register', checkFeature('allowRegistrations'), async (req, res) => {
  try {
    const { name, mobile, email, country, password, sponsorId } = req.body;
    const userIP = getClientIP(req);

    // 🔥 DEBUGGING LOGS: Inhe yahan paste karo
    console.log("-----------------------------------------");
    console.log("User IP Detected:", userIP); 
    const count = await User.countDocuments({ ipAddress: userIP });
    console.log("Total Users with this IP in DB:", count);
    console.log("-----------------------------------------");

    // 🛡️ ADMIN BYPASS CHECK
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const requestor = await User.findById(decoded.id);
            if (requestor && requestor.role === 'admin') isAdmin = true;
        } catch (e) { /* Guest registration */ }
    }

    // 🛑 REGISTRATION LIMIT: Ek IP se max 5 IDs
  if (!isAdmin) {
      // Ye query sirf unhe ginegi jinka IP match karta ho aur jo khali (null) na hon
      const totalRegisteredFromIP = await User.countDocuments({ 
        ipAddress: { $exists: true, $ne: null, $eq: userIP } 
      });

      if (totalRegisteredFromIP >= 5) {
        return res.status(403).json({ 
message: `Access Denied: Maximum registration limit reached. Only 5 accounts are allowed per device/IP (${userIP}).`        });
      }
    }

    if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
        return res.status(400).json({ message: 'Registration failed: Only @gmail.com emails are accepted.' });
    }

    if (!sponsorId) return res.status(400).json({ message: 'Sponsor ID is compulsory to register.' });

    let sponsorExists = await User.findOne({ userId: parseInt(sponsorId) });
    if (!sponsorExists && typeof DummyUser !== 'undefined') {
        sponsorExists = await DummyUser.findOne({ userId: parseInt(sponsorId) });
    }
    if (!sponsorExists) return res.status(400).json({ message: 'Invalid Sponsor ID.' });

    if (!name || !mobile || !email || !country || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ $or: [{ email: email }, { mobile: mobile }] });
    if (existingUser) {
        return res.status(400).json({ message: existingUser.mobile === mobile ? 'Mobile already registered.' : 'Email already registered.' });
    }

    const userId = await generateUserId();
    
    const user = new User({
      userId, name, mobile, email, country,
      password, transactionPassword: password,
      sponsorId: parseInt(sponsorId),
      role: 'user',
      ipAddress: userIP // IP Save ho raha hai
    });

    await user.save();

    // Welcome Email Logic
    try {
        await sendEmail({
            email: user.email,
            subject: '🎉 Welcome to USDBoomer!',
            html: `<h3>Welcome ${user.name}</h3><p>User ID: ${user.userId}<br>Password: ${password}</p>`
        });
    } catch (emailErr) { console.error("Email failed"); }

    res.status(201).json({ message: 'User registered successfully.', userId: user.userId, name: user.name, password: user.password });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ====================== LOGIN ======================
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const userIP = getClientIP(req);

    const user = await User.findOne({ userId });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // 🛡️ LOGIN LIMIT CHECK (Except Admin)
    if (user.role !== 'admin') {
        // Check how many UNIQUE users have logged in from this IP
        const uniqueUsersOnThisIP = await LoginHistory.distinct('userId', { ipAddress: userIP });
        
        // Agar ye user naya hai is IP ke liye aur 5 unique users pehle se hain, toh block karo
        if (uniqueUsersOnThisIP.length >= 5 && !uniqueUsersOnThisIP.includes(user.userId)) {
return res.status(403).json({ 
    message: 'Access Denied: Login limit exceeded. Only 5 unique accounts are allowed per IP address.' 
});        }
    }

    // Maintenance & Security Checks
    const settings = await Setting.findOne();
    if (settings) {
        if (settings.maintenanceMode && user.role !== 'admin') {
            const whitelist = (settings.maintenanceWhitelist || []).map(String);
            if (!whitelist.includes(String(user.userId))) return res.status(503).json({ message: 'Maintenance Mode.' });
        }
        if (!settings.allowLogin && user.role !== 'admin') return res.status(403).json({ message: 'Login is disabled.' });
    }

    if (password.toLowerCase() !== user.password.toLowerCase()) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isBlocked) return res.status(403).json({ message: 'Account blocked.' });


    if (!user.ipAddress) {
    // Agar purana user hai jiska IP save nahi hai, toh ab save kar lo
    user.ipAddress = userIP; 
    await user.save();
    console.log(`✅ Purane User ${user.userId} ka IP update ho gaya.`);
}

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });

    // Save Login History with IP
    try {
       await LoginHistory.create({
          userId: user.userId,
          name: user.name,
          mobile: user.mobile,
          ipAddress: userIP // Iske liye LoginHistory model mein ipAddress field hona chahiye
       });
    } catch (hErr) { console.error('History failed'); }

    res.json({ message: 'Login successful', token, user: sanitizeUser(user) });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== FORGOT/RESET PASSWORD ======================
// (Aapka purana forgot-password aur reset-password logic yahan rahega...)
// ...

 
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
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // ✅ Update password
    user.password = newPassword;
    user.transactionPassword = newPassword;

    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    // ✅ EMAIL SEND (UPDATED)
    try {
      await sendEmail({
        email: user.email,
        subject: '🔐 Password Reset Successful',
        html: `
        <div style="font-family: Arial; padding:20px;">
          <h2>✅ Password Reset Successful</h2>
          <p>Hello <b>${user.name}</b>,</p>

          <p>Your password has been updated successfully.</p>

          <div style="background:#f5f5f5; padding:15px; border-radius:8px;">
            <p><b>User ID:</b> ${user.userId}</p>
            <p><b>Password:</b> ${newPassword}</p>
            <p><b>Transaction Password:</b> ${newPassword}</p>
          </div>

          <br/>
          <a href="https://usdtboomers.com/login"
          style="background:#1e88e5; color:#fff; padding:12px 25px; text-decoration:none; border-radius:6px;">
          🔐 Login Now
          </a>
        </div>
        `,
      });
    } catch (e) {
      console.log("Email failed:", e.message);
    }

    // ✅ RESPONSE ME DATA BHEJO
    res.json({
      message: 'Password reset successful',
      userId: user.userId,
      password: newPassword,
      transactionPassword: newPassword,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;