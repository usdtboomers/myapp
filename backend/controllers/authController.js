const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// ----------------------------------------------------------------------
// 1. FORGOT PASSWORD (User ID se user dhundo aur Email bhejo)
// ----------------------------------------------------------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { userId } = req.body;

    // 1. User dhundo (Frontend se userId aa raha hai)
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User ID not found' });
    }

    // 2. Reset Token Generate karo
    const resetToken = user.getResetPasswordToken();

    // 3. User ko save karo (Token DB me save ho jayega)
    await user.save({ validateBeforeSave: false });

    // 4. Reset URL banao (Tumhari Live Site ka link)
    // Dhyan dena: Frontend route '/reset-password/:token' hona chahiye
    const resetUrl = `https://eliteinfinity.live/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password.</p>
      <p>Please click on the link below to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      // 5. Email Bhejo (Brevo use karega)
      await sendEmail({
        email: user.email, // DB se user ka email
        subject: 'Elite Infinity Password Reset',
        message: `Your reset link: ${resetUrl}`, // Plain text fallback
        html: message,
      });

      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      // Agar email fail ho jaye to token hata do
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ----------------------------------------------------------------------
// 2. RESET PASSWORD (Token verify karo aur naya password set karo)
// ----------------------------------------------------------------------
exports.resetPassword = async (req, res) => {
  try {
    // 1. URL se token lo aur hash karo (kyuki DB me hashed hai)
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // 2. User dhundo jiska token match kare aur expire na hua ho
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // 3. Password update karo
    user.password = req.body.newPassword;
    
    // 4. Token fields saaf karo
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // 5. Save (Is time password hashing middleware chalna chahiye model me)
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};