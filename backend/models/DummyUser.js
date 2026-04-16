const mongoose = require('mongoose');

const DummyUserSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  password: { type: String },
  country: { type: String },
  mobile: { type: String },
  isDummy: { type: Boolean, default: true },
  topUpAmount: { type: Number, default: 0 },
  sponsorId: { type: Number }, // Kis promo user ne ise generate kiya
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.DummyUser || mongoose.model('DummyUser', DummyUserSchema);