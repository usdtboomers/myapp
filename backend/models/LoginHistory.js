const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  name: { type: String },
  mobile: { type: String }, // 🔥 YEH LINE HONI CHAHIYE
  loginTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);