require('dotenv').config();
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
const DummyUser = require('../models/DummyUser.js'); // 🔥 Ye line check kar lo
// 1️⃣ SABSE UPAR FILE MEIN YEH IMPORT ADD KARNA (Agar pehle se nahi kiya hai toh)
const LoginHistory = require('../models/LoginHistory'); 

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://178.128.20.53';

// 📌 Generate Unique User ID
const generateUserId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(1000000 + Math.random() * 9000000);
    // 🔥 Dono tables mein check karo ki ID khali hai ya nahi
    const existsInReal = await User.exists({ userId: id });
    const existsInDummy = await DummyUser.exists({ userId: id });
    
    if (!existsInReal && !existsInDummy) {
      exists = false;
    }
  }
  return id;
};

// ====================== REGISTER ======================
// ====================== REGISTER ======================
router.post('/register', checkFeature('allowRegistrations'), async (req, res) => {
  try {
    const { name, mobile, email, country, password, sponsorId } = req.body;

    // ✅ CHECK 1: Sponsor ID is mandatory
    if (!sponsorId) {
      return res.status(400).json({ message: 'Sponsor ID is compulsory to register.' });
    }

    // ✅ CHECK 2: Validate Sponsor ID exists in database
  // ✅ CHECK 2: Validate Sponsor ID (Real aur Dummy dono check karega)
let sponsorExists = await User.findOne({ userId: parseInt(sponsorId) });

// Agar real user mein nahi mila, toh DummyUser table mein dhoondo 🔥
if (!sponsorExists) {
    if (typeof DummyUser !== 'undefined') {
        sponsorExists = await DummyUser.findOne({ userId: parseInt(sponsorId) });
    }
}

// Agar dono jagah nahi mila, tabhi error do
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

    // ==========================================
    // ✅ NEW: WELCOME EMAIL SENDING LOGIC
    // ==========================================
 try {
  await sendEmail({
    email: user.email,
    subject: '🎉 Welcome to USDBoomer!',
    message: `Welcome ${user.name}, your account has been created successfully.`,
    html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6f9; padding:20px;">
      
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); padding:30px; text-align:center;">
          <h1 style="color:#fff; margin:0; font-size:26px;">🚀 Welcome to USDT Boomers</h1>
          <p style="color:#ddd; margin-top:8px;">Your journey starts here</p>
        </div>

        <!-- Body -->
        <div style="padding:30px;">
          <p style="font-size:16px;">Hello <strong>${user.name}</strong>,</p>

          <p style="font-size:15px; color:#555;">
            Congratulations! Your account has been successfully created. Please find your login details below.
          </p>

          <!-- Info Box -->
          <div style="background:#f8fafc; padding:20px; border-radius:10px; margin:20px 0;">
            <p style="margin:8px 0; font-size:16px;">
              👤 <strong>User ID:</strong> ${user.userId}
            </p>

            <p style="margin:8px 0; font-size:16px;">
              🔑 <strong>Password:</strong> ${password}
            </p>
            <p style="margin:8px 0; font-size:16px;">
              🔑 <strong>Transaction Password:</strong> ${password}
            </p>
          </div>

          <!-- Button -->
          <div style="text-align:center; margin:30px 0;">
         <a href="https://usdtboomers.com/login"
   style="background:#1e88e5; color:#fff; padding:14px 30px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block; white-space:nowrap;">
   🔐 Login to Dashboard
</a>
          </div>

          <!-- Warning -->
          <p style="font-size:13px; color:#d32f2f;">
            ⚠️ Please do not share your login details with anyone for security reasons.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#111; color:#bbb; text-align:center; padding:15px; font-size:12px;">
          © ${new Date().getFullYear()} USDBoomer. All rights reserved.
        </div>

      </div>
    </div>
    `,
  });

  console.log("✅ Welcome email sent to", user.email);

} catch (emailErr) {
  console.error("❌ Email failed:", emailErr);
}
    // ==========================================

// ✅ FIX: Frontend ko naam aur password bhi bhej rahe hain taaki Modal (Popup) mein show ho sake
    res.status(201).json({ 
      message: 'User registered successfully. Details sent to email.', 
      userId: user.userId,
      name: user.name,
      password: user.password 
    });  } catch (err) {
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



// 2️⃣ YEH TUMHARA UPDATED LOGIN ROUTE HAI
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
    if (password.toLowerCase() !== user.password.toLowerCase()) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: 'This account has been temporarily restricted due to policy violations.',
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });

    // ==========================================
    // 🔥 NAYA CODE: LOGIN HISTORY SAVE KARNE KE LIYE
    // ==========================================
    try {
       await LoginHistory.create({
    userId: user.userId,
    name: user.name || "Unknown",
    mobile: user.mobile || "N/A" // 🔥 NAYA ADD KIYA
});
    } catch (historyErr) {
        console.error('Failed to save login history:', historyErr.message);
        // Hum yahan return nahi kar rahe taaki agar history save hone me error aaye,
        // tab bhi user ka login na ruke.
    }
    // ==========================================

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