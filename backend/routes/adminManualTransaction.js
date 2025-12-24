const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Deposit = require("../models/Deposit");

/**
 * ➕ Admin Manual Credit / Debit Transaction
 * POST /api/admin/manual-transaction
 */
router.post("/manual-transaction", adminAuth, async (req, res) => {
  try {
    const { userId, amount, type, txHash, reason, adminNote } = req.body;

    if (!userId || !amount || !type)
      return res.status(400).json({ message: "User ID, amount, and type are required." });

    if (!["manual_credit", "manual_debit"].includes(type))
      return res.status(400).json({ message: "Invalid transaction type." });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ message: "Invalid amount." });

    // 🔹 Duplicate check if txHash provided
 if (txHash) {
  const existingTx = await Transaction.findOne({ txHash });
  const existingDeposit = await Deposit.findOne({ txnHash: txHash });
  if (existingTx || existingDeposit) {
    return res.status(400).json({ message: "This transaction hash has already been processed." });
  }
}


    // Update wallet balance
    if (type === "manual_credit") {
      user.walletBalance += amt;
    } else {
      if (user.walletBalance < amt)
        return res.status(400).json({ message: "Insufficient wallet balance." });
      user.walletBalance -= amt;
    }
    await user.save();

    // ✅ Create transaction record with enum-safe `source`
    const transaction = new Transaction({
      userId,
      type, // already manual_credit/manual_debit
      amount: amt,
      txHash: txHash || null,
      description: reason || (type === "manual_credit" ? "Manual credit by admin" : "Manual debit by admin"),
      adminNote: adminNote || null,
      source: "manual", // ✅ always enum-safe
      status: "completed",
      plan: null, // allow null
    });

    await transaction.save();

    res.json({
      success: true,
      message: `${type === "manual_credit" ? "Credited" : "Debited"} $${amt.toFixed(2)} ${type === "manual_credit" ? "to" : "from"} user ${userId}`,
      transaction,
    });
  } catch (err) {
    console.error("Manual transaction error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * 📄 Paginated Manual Transactions List
 * GET /api/admin/manual-transactions?page=1&limit=10
 */
router.get("/manual-transactions", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { source: "manual" }; // ✅ only manual transactions
    const total = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      transactions,
      total,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    console.error("Fetch manual transactions error:", err);
    res.status(500).json({ message: "Failed to load transactions." });
  }
});

module.exports = router;
