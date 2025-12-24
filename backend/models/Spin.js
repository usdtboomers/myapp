const mongoose = require("mongoose");

const SpinSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },

    used: { type: Boolean, default: false },
    usedAt: { type: Date },

    reward: { type: mongoose.Decimal128 },
    status: {
      type: String,
      enum: ["Pending", "Credited", "No Win"], // ✅ Added "Pending"
      default: "Pending", // ✅ Default fixed
    },
    lastSpinWin: { type: Number, default: 0 }

  },
  { timestamps: true }
);

// Index for faster queries on available spins
SpinSchema.index({ userId: 1, used: 1 });

// ✅ Validation for used spins
SpinSchema.pre("save", function (next) {
  // If spin is marked as used, it must have a reward and a non-pending status
  if (this.used && (this.reward === undefined || this.status === "Pending")) {
    return next(new Error("Used spins must have reward and status set"));
  }
  next();
});

// ✅ Convert Decimal128 to number automatically when JSONified
SpinSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.reward && ret.reward.$numberDecimal) {
      ret.reward = parseFloat(ret.reward.$numberDecimal);
    }
    return ret;
  },
});

module.exports = mongoose.model("Spin", SpinSchema);
