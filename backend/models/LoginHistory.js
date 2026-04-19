const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  name: { type: String },
  mobile: { type: String }, // 🔥 YEH LINE HONI CHAHIYE
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String}, // IP save karne ke liye field

});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);