const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Admin = require("../models/Admin"); 
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Deposit = require("../models/Deposit");
const bcrypt = require("bcryptjs");

router.post("/manual-transaction", adminAuth, async (req, res) => {
  try {
    console.log("\n--- 👉 Manual Transaction Processing ---");

    // 1. Data Extract karo
    // Note: Frontend kabhi 'password' bhejta hai, kabhi 'adminPassword'. Hum dono check karenge.
    const { userId, amount, type, txHash, reason, adminNote, adminPassword, password } = req.body;
    
    // Jo bhi password aaya ho use le lo
    const finalPassword = adminPassword || password;

    if (!finalPassword) {
      return res.status(400).json({ message: "Admin password is required." });
    }

    // 🔍 2. Token se Admin ID nikalo
    // Middleware (adminAuth) ne token decode karke req.user ya req.admin me data dala hoga
    const tokenData = req.admin || req.user;
    
    // Token me humesha MongoDB ki unique '_id' hoti hai. Wahi sabse reliable hai.
    const adminDbId = tokenData.adminId || tokenData.id || tokenData._id;

    console.log(`👉 Searching Admin by DB ID: "${adminDbId}"`);

    // 🔍 3. Database Search (Direct ID se)
    const admin = await Admin.findById(adminDbId);

    if (!admin) {
      console.log("❌ Admin Record Not Found via Token ID.");
      return res.status(404).json({ message: "Admin account not found. Please Re-Login." });
    }

    // 4. Password Verification (Bcrypt)
    // Ab hum database wale hash se user ka password match karenge
    const isMatch = await bcrypt.compare(finalPassword, admin.password);
    
    if (!isMatch) {
      console.log("❌ Password Mismatch");
      return res.status(403).json({ message: "Incorrect Admin Password! Access Denied." });
    }

    console.log("✅ Password Matched & Admin Verified!");

    // --- ⬇️ TRANSACTION LOGIC START ---

    if (!userId || !amount || !type)
      return res.status(400).json({ message: "User ID, amount, and type are required." });

    const targetUser = await User.findOne({ userId });
    if (!targetUser) return res.status(404).json({ message: "Target User not found." });

    const amt = parseFloat(amount);
    
    // Duplicate check
    if (txHash) {
      const existingTx = await Transaction.findOne({ txHash });
      const existingDeposit = await Deposit.findOne({ txnHash: txHash });
      if (existingTx || existingDeposit) {
        return res.status(400).json({ message: "TxHash already used." });
      }
    }

    // Update Wallet
    if (type === "manual_credit") {
      targetUser.walletBalance += amt;
    } else {
      if (targetUser.walletBalance < amt) return res.status(400).json({ message: "Insufficient balance." });
      targetUser.walletBalance -= amt;
    }
    
    // Save User Balance
    await targetUser.save();

    // Create History
    const transaction = new Transaction({
      userId,
      type,
      amount: amt,
      txHash: txHash || `MANUAL-${Date.now()}`, // Agar hash nahi diya to auto-generate
      description: reason || "Manual By Admin",
      adminNote: adminNote || null,
      source: "manual",
      status: "completed",
      plan: null,
    });

    await transaction.save();

    res.json({
      success: true,
      message: "Transaction Successful",
      transaction,
    });

  } catch (err) {
    console.error("❌ Critical Error:", err);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
});

// GET Route (Same as before)
router.get("/manual-transactions", adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = { source: "manual" };
        const total = await Transaction.countDocuments(filter);
        const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
        res.json({ transactions, total, totalPages: Math.ceil(total / limit), currentPage: page });
    } catch (err) {
        res.status(500).json({ message: "Error loading transactions" });
    }
});

module.exports = router;