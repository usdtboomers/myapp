const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  name: { type: String, default: "-" },

  source: {
    type: String,
    required: true,
    enum: [
      "direct", 
      "level", 
      "spin",   
      "binary", 
      "reward", // ✅ YAHAN "reward" ADD KIYA HAI (Naye frontend boxes ke liye)
      "mixed",  
      "plan",   // ✅ YAHAN "plan" ADD KIYA HAI (Taki fallback me error na aaye)
      "plan1","plan2","plan3","plan4","plan5","plan6","plan7"
    ]
  },

  grossAmount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },

  walletUsed: { type: Number, default: 0 },
  incomeUsed: { type: Number, default: 0 },

  walletAddress: { type: String, default: "" }, 
  txnHash: { type: String, default: "" },

  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  schedule: [
    {
      day: String,
      date: String,
      percent: Number,
      grossAmount: { type: Number, default: 0 },
      fee: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 },
      walletUsed: { type: Number, default: 0 },
      incomeUsed: { type: Number, default: 0 },
      status: { type: String, default: "pending" },

      // 🔥 CRITICAL
      walletAddress: { type: String, default: "" }
    }
  ]
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);