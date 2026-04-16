const mongoose = require('mongoose');

// 1. Pehle Schema define karo (Variable ka naam dhyan se dekho)
const DummyTransactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true }, // Promo user ki ID
  generatedId: { type: Number, required: true }, // Jo dummy ID generate hui
  amount: { type: Number, required: true },
  type: { type: String, default: "promo_topup" },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// 2. Ab ise export karo (Yahan wahi naam use karo jo upar define kiya hai)
module.exports = mongoose.models.DummyTransaction || mongoose.model('DummyTransaction', DummyTransactionSchema);