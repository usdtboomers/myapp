const mongoose = require('mongoose');

// 📈 Daily ROI plan schema
const dailyROISchema = new mongoose.Schema({
  plan: {
    type: String,
    required: true,
    enum: ['plan1','plan2','plan3','plan4','plan5','plan6','plan7']
  },
  amount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  claimedDays: { type: Number, default: 0 },
  maxDays: { type: Number, default: 10 },
  totalEarned: { type: Number, default: 0 },
  lastCreditedDate: { type: Date },
  dailyDetails: { type: Array, default: [] },
}, { _id: false });

// 🎰 Spin tracking schema
const spinStatsSchema = new mongoose.Schema({
  used: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
}, { _id: false });

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

  // 🔹 Referral
  sponsorId: { type: Number, default: null },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

  // 🔹 Wallet & Top-up
  walletBalance: { type: Number, default: 0 },
  withdrawableBalance: { type: Number, default: 0 },

  isToppedUp: { type: Boolean, default: false },
  topUpAmount: { type: Number, default: 0 },
  topUpDate: { type: Date },

  topUps: [{
    plan: {
      type: String,
      enum: ['plan1','plan2','plan3','plan4','plan5','plan6','plan7'],
      required: true
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],

  // 🔹 ROI
  dailyROI: { type: [dailyROISchema], default: [] },

  // 🔹 Plan incomes
  planIncome: {
    type: Object,
    default: () => ({
      plan1: 0,
      plan2: 0,
      plan3: 0,
      plan4: 0,
      plan5: 0,
      plan6: 0,
      plan7: 0,
    }),
  },

  directIncome: { type: Number, default: 0 },
  levelIncome: { type: Number, default: 0 },
  spinIncome: { type: Number, default: 0 },

  lifetimeBonusROI: { type: Array, default: [] },
  hasReceivedTopupBonus: { type: Boolean, default: false },

  // 🔹 Withdrawal tracking
  pendingWithdrawals: {
    plan1: { type: Number, default: 0 },
    plan2: { type: Number, default: 0 },
    plan3: { type: Number, default: 0 },
    plan4: { type: Number, default: 0 },
    plan5: { type: Number, default: 0 },
    plan6: { type: Number, default: 0 },
    plan7: { type: Number, default: 0 },
  },

  // 🔹 Spins
  spins: {
    type: spinStatsSchema,
    default: () => ({ used: 0, totalEarned: 0 })
  },

  // =========================
  // 🔐 WALLET ADDRESS SECURITY (NEW)
  // =========================
  walletAddress: { type: String, default: '' },

  // 24 hr me max 2 changes
  walletAddressChangeCount: { type: Number, default: 0 },
  walletAddressChangeWindowStart: { type: Date, default: null },

  // History of old addresses
  walletAddressHistory: [
    {
      address: { type: String },
      changedAt: { type: Date },
    }
  ],


totalWithdrawn: { type: Number, default: 0 }, // total withdrawal sum

  
  // =========================
// 🔷 BINARY INCOME SYSTEM
// =========================
primaryStrongDirect: {
  type: Number,   // direct userId
  default: null
},
// 🔷 Withdrawal based binary tracking
strongLegBusiness: { type: Number, default: 0 },
weakLegBusiness:   { type: Number, default: 0 },
binaryIncome:      { type: Number, default: 0 },

hasWithdrawn100: { type: Boolean, default: false },


  // 🔹 System
role: { type: String, enum: ['user','admin','promo'], default: 'user' },
  isBlocked: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
