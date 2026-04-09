const mongoose = require('mongoose');

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

  depositAddress: {
    type: String,
    unique: true,
    sparse: true 
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
        enum: ['plan0','plan1','plan2','plan3','plan4','plan5','plan6'],
        required: true
      },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }
  ],

  // ✅ NEW PACKAGE SYSTEM
  packages: [
    {
      plan: {
        type: String,
        enum: ['plan0','plan1','plan2','plan3','plan4','plan5','plan6'],
        required: true
      },
      amount: { type: Number, required: true },
      startDate: { type: Date, default: Date.now },
      withdrawn: { type: Number, default: 0 } 
    }
  ],

  purchasedPackages: { 
    type: [Number], 
    default: [] 
  },

  // 💰 Incomes
  directIncome: { type: Number, default: 0 },
  levelIncome: { type: Number, default: 0 },
  
  // 🏆 Reward System (Manager Ranks)
  managerRank: { type: Number, default: 0 },
  seniorManagerRank: { type: Number, default: 0 },
  executiveManagerRank: { type: Number, default: 0 },

   

  // ✅ FIX: Changed from Number to String to support "M1", "SM2" etc.
  claimedRewards: { type: [String], default: [] }, 
  rewardIncome: { type: Number, default: 0 }, 
  totalRewardIncome: { type: Number, default: 0 }, // ✅ ADD THIS LINE for lifetime total
  totalDirectIncome: { type: Number, default: 0 }, // ✅ ADD THIS TOO (you use it in your topup route!)
  // 🔹 Withdrawal tracking (plan-wise)
  pendingWithdrawals: {
    plan0: { type: Number, default: 0 }, // ✅ Added plan0
    plan1: { type: Number, default: 0 },
    plan2: { type: Number, default: 0 },
    plan3: { type: Number, default: 0 },
    plan4: { type: Number, default: 0 },
    plan5: { type: Number, default: 0 },
    plan6: { type: Number, default: 0 },
  },

  totalWithdrawn: { type: Number, default: 0 },
  
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

  // 🔹 Role & Status
  role: { type: String, enum: ['user', 'admin', 'promo'], default: 'user' },
  isBlocked: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);