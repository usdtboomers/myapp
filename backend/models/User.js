const mongoose = require('mongoose');

// 🎰 Spin tracking (Agar aapne alag se banaya hai toh yahan rahega)

// 🧱 MAIN USER SCHEMA
const userSchema = new mongoose.Schema({
  // 🔹 Identity
  userId: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  country: { type: String, required: true },

  // 🔹 Auth
  password: { type: String, required: true },
  transactionPassword: { type: String, required: true },

  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },

  // 🔹 Referral
  sponsorId: { type: Number, default: null },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

    // Add this to your User model schema
depositAddress: {
  type: String,
  unique: true,
  sparse: true // Allows nulls if the user hasn't generated one yet
},
  // 🔹 Wallet & Top-up
  walletBalance: { type: Number, default: 0 },

  isToppedUp: { type: Boolean, default: false },
  topUpAmount: { type: Number, default: 0 },
  topUpDate: { type: Date },

  // 📜 Top-up history
  topUps: [
    {
      plan: {
        type: String,
        enum: ['plan1','plan2','plan3','plan4','plan5','plan6'],
        required: true
      },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }
  ],

  // ✅ 📦 NEW PACKAGE SYSTEM (MAIN LOGIC)
  packages: [
    {
      plan: {
        type: String,
        enum: ['plan1','plan2','plan3','plan4','plan5','plan6'],
        required: true
      },
      amount: { type: Number, required: true },
      startDate: { type: Date, default: Date.now },
      withdrawn: { type: Number, default: 0 } // kitna withdraw ho chuka
    }
  ],

  // 🔥 YEH DONO FIELDS MISSING THE, JINKI WAJAH SE TOPUP MEIN ERROR AAYA THA 🔥
  purchasedPackages: { 
    type: [Number], // Jaise [30, 60] save hoga yahan
    default: [] 
  },
 

  // 💰 Incomes
  directIncome: { type: Number, default: 0 },
  levelIncome: { type: Number, default: 0 },
  
  // 🏆 Reward System (Manager Ranks)
  managerRank: { type: Number, default: 0 }, // 0 se 9 tak
  claimedRewards: { type: [Number], default: [] }, // Jo reward le liya usko track karega (e.g., [1, 2])
  rewardIncome: { type: Number, default: 0 }, // Isme paisa aayega

  // 🔹 Withdrawal tracking (plan-wise)
  pendingWithdrawals: {
    plan1: { type: Number, default: 0 },
    plan2: { type: Number, default: 0 },
    plan3: { type: Number, default: 0 },
    plan4: { type: Number, default: 0 },
    plan5: { type: Number, default: 0 },
    plan6: { type: Number, default: 0 },
  },

  totalWithdrawn: { type: Number, default: 0 },
  
  // 🎰 Spins (Agar future me add karna ho)
  
  // 🔐 Wallet Security
  walletAddress: { type: String, default: '' },
  walletAddressChangeCount: { type: Number, default: 0 },
  walletAddressChangeWindowStart: { type: Date, default: null },
  walletAddressHistory: [
    {
      address: { type: String },
      changedAt: { type: Date },
    }
  ],

  // 🔷 Binary System (Agar future me add karna ho)
  
  // 🔹 Role & Status
  role: { type: String, enum: ['user', 'admin', 'promo'], default: 'user' },
  isBlocked: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);