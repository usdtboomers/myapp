const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true, // fast lookup by user
    },
    name: {
      type: String,
      default: "",
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128, // high precision for crypto/finance
      required: true,
      validate: {
        validator: (v) => v > 0,
        message: 'Amount must be greater than 0',
      },
    },
    txnHash: {
      type: String, // store blockchain tx hash
      unique: true,
      sparse: true, // allows multiple nulls
      index: true,
    },
    method: {
      type: String, // e.g., "Web3", "USDT (BEP-20)"
      default: "Web3",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true, // speed up status queries
    },
    currency: {
      type: String, // optional, if multiple tokens are supported
      default: "USD",
    },
    adminNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for sorting by creation date
depositSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Deposit", depositSchema);
