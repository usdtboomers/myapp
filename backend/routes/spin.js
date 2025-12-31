const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Spin = require("../models/Spin");
const auth = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// 🟢 Test Route
router.get("/", (req, res) => {
  res.send("🎰 Spin API is working ✅");
});

// 🔐 Jackpot Protection Controls
const MAX_DAILY_JACKPOT = 49;
let dailyJackpotGiven = 0;
const SAFE_BALANCE_LIMIT = 50;

// 🎯 Spin Rewards Pool
const rewardPool = [
  { reward: 1, weight: 15 },
  { reward: 2, weight: 15 },
  { reward: 3, weight: 20 },
  { reward: 4, weight: 18 },
  { reward: 5, weight: 18 },
  { reward: 10, weight: 8 },
  { reward: 20, weight: 3 },
  { reward: 50, weight: 0.4 },
  { reward: 100, weight: 0.1 }
];

const smallRewardPool = rewardPool.filter((r) => r.reward <= 10);

// 🎲 Weighted random reward picker
function getRandomRewardFromPool(pool) {
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let rand = Math.random() * total;

  for (let r of pool) {
    if (rand < r.weight) return r.reward;
    rand -= r.weight;
  }
  return pool[0].reward;
}

// =========================================================
// 🎰 ROUTE 1: Use a Spin (SECURED WITH TRANSACTIONS)
// =========================================================
router.post("/", auth, async (req, res) => {
  const session = await mongoose.startSession(); // 🔒 Start Session
  session.startTransaction();

  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId }).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // --- PROMO USER LOGIC (No Transaction needed) ---
    if (user.role === "promo") {
      await session.abortTransaction(); // End session for promo
      session.endSession();
      const reward = getRandomRewardFromPool(rewardPool);
      return res.status(200).json({
        success: true,
        reward,
        availableSpins: 999999,
        spin: {
          id: "PROMO-SPIN",
          reward,
          status: reward > 0 ? "Credited (Promo)" : "No Win (Promo)",
          date: new Date(),
        },
        message: reward > 0 ? `🎉 You won ${reward} USDT (PROMO)` : "😢 Better luck next time (PROMO)",
      });
    }

    // 🔒 ATOMIC CLAIM: Find and update spin in one go
    const spin = await Spin.findOneAndUpdate(
      { userId, used: false },
      { used: true, usedAt: new Date() },
      { new: true, session: session } // Pass session
    );

    if (!spin) {
      await session.abortTransaction();
      session.endSession();
      const availableSpins = await Spin.countDocuments({ userId, used: false });
      return res.status(400).json({
        success: false,
        message: "No spins available. Do a top-up to earn spins.",
        availableSpins,
      });
    }

    // --- REWARD LOGIC ---
    let reward = getRandomRewardFromPool(rewardPool);
    const systemBalance = user.walletBalance;

    // Rule 2: Balance Safety
    if (systemBalance < SAFE_BALANCE_LIMIT) {
      reward = getRandomRewardFromPool(smallRewardPool);
    }

    // Rule 1: Daily Cap
    if (reward >= 20) {
      if (dailyJackpotGiven + reward > MAX_DAILY_JACKPOT) {
        reward = getRandomRewardFromPool(smallRewardPool);
      } else {
        dailyJackpotGiven += reward;
      }
    }

    // Rule 3: Anti-Abuse
    if (user.lastSpinWin && user.lastSpinWin >= 20) {
      reward = getRandomRewardFromPool(smallRewardPool);
    }

    // --- SAVE UPDATES WITHIN SESSION ---
    spin.reward = mongoose.Types.Decimal128.fromString(reward.toString());
    spin.status = reward > 0 ? "Credited" : "No Win";
    await spin.save({ session });

    // Update User Stats
    await User.updateOne(
      { userId },
      {
        $set: { lastSpinWin: reward >= 20 ? reward : 0 },
        $inc: {
          "spins.used": 1,
          "spins.totalEarned": reward,
          spinIncome: reward,
          // walletBalance is NOT updated here? Usually winning adds to wallet.
          // Assuming you have a separate logic or want to add to wallet:
         }
      }
    ).session(session);

    // Create Transaction Log
    if (reward > 0) {
      await Transaction.create(
        [{
          userId,
          type: "spin_income",
          plan: "plan1",
          amount: mongoose.Types.Decimal128.fromString(reward.toString()),
          description: `Spin reward credited: ${reward} USDT`,
        }],
        { session }
      );
    }

    // ✅ COMMIT TRANSACTION (Sab sahi hai, save karo)
    await session.commitTransaction();
    session.endSession();

    // Get remaining spins count (No session needed for read)
    const availableSpins = await Spin.countDocuments({ userId, used: false });
    const rewardNumber = parseFloat(spin.reward.toString());

    return res.status(200).json({
      success: true,
      reward: rewardNumber,
      availableSpins,
      spin: {
        id: spin._id,
        reward: rewardNumber,
        status: spin.status,
        date: spin.usedAt,
      },
      message: reward > 0 ? `🎉 You won ${reward} USDT!` : "😢 Better luck next time!",
    });

  } catch (err) {
    // ❌ ROLLBACK (Kuch gadbad hui, sab wapas)
    await session.abortTransaction();
    session.endSession();
    console.error("Spin error:", err);
    return res.status(500).json({ success: false, message: "Spin failed. Please try again." });
  }
});

// =========================================================
// 📥 ROUTE 2: Buy Spins (SECURED ATOMIC UPDATE)
// =========================================================
router.post("/buy", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { quantity, transactionPassword } = req.body;
    const numSpins = parseInt(quantity) || 1;

    if (numSpins <= 0) return res.status(400).json({ success: false, message: "Invalid quantity." });
    if (!transactionPassword) return res.status(400).json({ success: false, message: "Password required." });

    const costPerSpin = 5;
    const totalCost = numSpins * costPerSpin;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Verify Password
    const isMatch = await bcrypt.compare(transactionPassword, user.transactionPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect transaction password." });

    // 🔒 SECURE DEDUCTION: Atomic update using findOneAndUpdate
    // This prevents race conditions (double spending)
    const updatedUser = await User.findOneAndUpdate(
      { 
        userId: userId, 
        walletBalance: { $gte: totalCost } // ✅ CHECK: Balance must be >= cost
      },
      { 
        $inc: { walletBalance: -totalCost } // ✅ DEDUCT: Atomic decrement
      },
      { new: true } // Return updated doc
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance or transaction failed.",
      });
    }

    // Award Spins
    const spins = [];
    for (let i = 0; i < numSpins; i++) {
      spins.push({ userId, used: false });
    }
    // Bulk insert is faster
    await Spin.insertMany(spins);

    // Record Transaction
    await Transaction.create({
      userId,
      type: "buy_spin",
      plan: "plan1",
      amount: -totalCost,
      description: `Bought ${numSpins} spin(s) for $${totalCost}`
    });

    const availableSpins = await Spin.countDocuments({ userId, used: false });

    return res.status(200).json({
      success: true,
      message: `Successfully purchased ${numSpins} spin(s).`,
      spent: totalCost,
      availableSpins,
      walletBalance: updatedUser.walletBalance,
    });

  } catch (err) {
    console.error("Buy spin error:", err);
    return res.status(500).json({ success: false, message: "Failed to buy spins." });
  }
});

// =========================================================
// 📜 ROUTE 3: Spin History (Optimized Read)
// =========================================================
router.get("/history", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId }).select("walletBalance"); // Select only needed fields

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const history = await Spin.find({ userId, used: true })
      .sort({ usedAt: -1 })
      .limit(50); // ✅ Limit to last 50 for performance

    const formattedHistory = history.map((spin) => ({
      id: spin._id,
      reward: spin.reward ? parseFloat(spin.reward.toString()) : 0,
      status: spin.status,
      date: spin.usedAt || spin.createdAt,
    }));

    const availableSpins = await Spin.countDocuments({ userId, used: false });

    return res.status(200).json({
      success: true,
      count: formattedHistory.length,
      availableSpins,
      walletBalance: user.walletBalance,
      history: formattedHistory,
      rewardPool: rewardPool.map((r) => r.reward),
    });
  } catch (err) {
    console.error("Spin history error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch history." });
  }
});

// 🎁 Admin: Award Spin
router.post("/award/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const newSpin = await Spin.create({ userId, used: false });
    return res.status(200).json({ success: true, message: "Spin awarded!", spin: newSpin });
  } catch (err) {
    console.error("Spin award error:", err);
    return res.status(500).json({ success: false, message: "Failed to award spin." });
  }
});

module.exports = router;