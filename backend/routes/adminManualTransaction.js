const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Admin = require("../models/Admin"); // ✅ Aapka Admin Model
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Deposit = require("../models/Deposit");
const bcrypt = require("bcryptjs");

router.post("/manual-transaction", adminAuth, async (req, res) => {
  try {
    console.log("\n--- 👉 Manual Transaction Processing ---");

    const { userId, amount, type, txHash, reason, adminNote, adminPassword } = req.body;

    // 1. Password check input
    if (!adminPassword) {
      return res.status(400).json({ message: "Admin password is required." });
    }

    // 🔍 2. Token Data Nikalo
    const tokenData = req.admin || req.user;
    
    // Token se jo bhi ID mili hai, usse extract karo
    // (Ye 'admin' string bhi ho sakti hai, ya '68c2...' ID bhi)
    const incomingId = tokenData.id || tokenData._id || tokenData.adminId || tokenData.userId;
    
    console.log(`👉 Token ID received: "${incomingId}"`);

    // 🔍 3. Database Search (HYBRID LOGIC)
    let admin = null;

    // STEP A: Agar ye valid MongoDB ID dikh raha hai (24 chars hex), to _id se dhoondo
    if (incomingId && incomingId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        admin = await Admin.findById(incomingId);
    }

    // STEP B: Agar abhi tak nahi mila, to isko 'adminId' String samajh ke dhoondo
    // (Aapke case me 'adminId': 'admin' hai)
    if (!admin) {
        console.log("👉 Checking by 'adminId' field...");
        admin = await Admin.findOne({ adminId: incomingId });
    }
    
    // STEP C: Fallback - Agar token me ID nahi thi, par hardcoded 'admin' check karna hai
    if (!admin && incomingId === undefined) {
         // Agar token structure alag hai, last try 'admin' string se
         admin = await Admin.findOne({ adminId: "admin" });
    }

    // --- CHECK RESULT ---
    if (!admin) {
      console.log("❌ Admin Record Not Found in DB.");
      // Security: User ko batao ki re-login kare
      return res.status(404).json({ message: "Admin account not found. Token ID mismatch. Please Re-Login." });
    }

    console.log(`✅ Admin Found: ${admin.adminId} (Role: ${admin.role})`);

    // 4. Password Verification
    let isMatch = false;
    try {
        if (admin.comparePassword) {
             // Aapke schema method ka use
            isMatch = await admin.comparePassword(adminPassword);
        } else {
            // Standard bcrypt compare
            isMatch = await bcrypt.compare(adminPassword, admin.password);
        }
    } catch (err) {
        console.error("Password compare error:", err);
        return res.status(500).json({ message: "Error verifying password" });
    }
    
    if (!isMatch) {
      console.log("❌ Password Mismatch");
      return res.status(403).json({ message: "Incorrect Admin Password! Access Denied." });
    }

    // --- 🔓 SECURITY PASS ---

    // --- ⬇️ TRANSACTION LOGIC (Same as before) ---

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
    await targetUser.save();

    // Create History
    const transaction = new Transaction({
      userId,
      type,
      amount: amt,
      txHash: txHash || null,
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