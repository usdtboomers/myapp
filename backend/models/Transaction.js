const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },

    // 🔹 Transaction type
    type: {
      type: String,
      enum: [
        "topup",
        "direct_income",
        "level_income",
        "plan_income",
        "withdrawal",
        "deposit",
        "binary_income",
        "spin_income",
        "buy_spin",
        "use_spin",
        "transfer",
        "credit_to_wallet",
        "reversal_log",
        "instant_withdraw",
        "manual_credit",
        "manual_debit",
        "refund",
        "reward_income" // ✅ Added for Manager Rewards
      ],
      required: true,
    },

    // 🔹 Transaction source
    source: {
      type: String,
      enum: [
        "direct",
        "level",
        "plan",
        "spin",
        "buy_spin",
        "use_spin",
        "binary",
        "topup",
        "manual",
        "mixed",
        "reward", // ✅ Added generic reward
        "manager_level_1", // ✅ Added specific levels
        "manager_level_2",
        "manager_level_3",
        "manager_level_4",
        "manager_level_5",
        "manager_level_6",
        "manager_level_7",
        "manager_level_8",
        "manager_level_9",
        null,
      ],
      default: null,
    },

    // 🔹 Amounts
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    grossAmount: { type: mongoose.Schema.Types.Decimal128, default: null },

    fromUserId: { type: Number, default: null },
    toUserId: { type: Number, default: null },

    package: { type: Number, default: null },

    plan: {
      type: String,
      enum: ["plan0","plan1", "plan2", "plan3", "plan4", "plan5", "plan6", "plan7", null],
      default: null,
    },

    level: { type: Number, default: null },

    description: { type: String, default: "" },
    txHash: { type: String, default: null },
    adminNote: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },

    date: { type: Date, default: Date.now },

    fromAddress: { type: String },
toAddress: { type: String },
    // 🔹 Reversal fields
    reversed: { type: Boolean, default: false },
    reversedAt: { type: Date, default: null },
    reversalReason: { type: String, default: "" },

    // 🔹 Linking related transactions
    relatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  { timestamps: true }
);



// ✅ Indexes
transactionSchema.index({ userId: 1, type: 1, plan: 1, level: 1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ status: 1 });

// 🔹 Convert Decimal128 → number
transactionSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.amount) ret.amount = parseFloat(ret.amount.toString());
    if (ret.grossAmount) ret.grossAmount = parseFloat(ret.grossAmount.toString());
    return ret;
  },
});




module.exports = mongoose.model("Transaction", transactionSchema);