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
const MAX_DAILY_JACKPOT = 49; // $ per day
let dailyJackpotGiven = 0;     // reset daily (later cron)

const SAFE_BALANCE_LIMIT = 50; // system safety limit


// 🎯 Spin Rewards Pool (adjust probabilities)
// 🎯 Updated Spin Rewards Pool (rarer big wins)
const rewardPool = [
  { reward: 1,   weight: 15 },   // 35%
  { reward: 2,   weight: 15},   // 22%
  { reward: 3,   weight: 20 },   // 15%
  { reward: 4,   weight: 18 },   // 12%
  { reward: 5,   weight: 18},    // 8%
  { reward: 10,  weight: 8 },    // 5%
  { reward: 20,  weight: 3 },    // 2% (~1 in 50 spins)
  { reward: 50,  weight: 0.4 },  // 0.4% (~1 in 250 spins)
  { reward: 100, weight: 0.1 }   // 0.1% (~1 in 1000 spins)
];

const smallRewardPool = rewardPool.filter(r => r.reward <= 10);


// 🎲 Default reward picker (full pool)
function getRandomReward() {
  return getRandomRewardFromPool(rewardPool);
}

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


// 🎰 Use a Spin
// 🎰 Use a Spin
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }



    
// ===============================
// 🔴 PROMO USER SPIN (UNLIMITED - DISPLAY ONLY)
// ===============================
if (user.role === "promo") {
const reward = getRandomRewardFromPool(rewardPool);

  return res.status(200).json({
    success: true,
    reward,
    availableSpins: 999999, // 🔓 unlimited display
    spin: {
      id: "PROMO-SPIN",
      reward,
      status: reward > 0 ? "Credited (Promo)" : "No Win (Promo)",
      date: new Date(),
    },
    message:
      reward > 0
        ? `🎉 You won ${reward} USDT (PROMO)`
        : "😢 Better luck next time (PROMO)",
  });
}

    // Atomically claim one unused spin
    const spin = await Spin.findOneAndUpdate(
      { userId, used: false },
      { used: true, usedAt: new Date() },
      { new: true }
    );

    if (!spin) {
      const availableSpins = await Spin.countDocuments({ userId, used: false });
      return res.status(400).json({
        success: false,
        message: "No spins available. Do a top-up to earn spins.",
        availableSpins,
      });
    }

    // Generate reward
let reward = getRandomRewardFromPool(rewardPool);

 
// ===============================
// 🔒 RULE 2: BALANCE-BASED LIMITER
// ===============================
const systemBalance = user.walletBalance; // simplified assumption

if (systemBalance < SAFE_BALANCE_LIMIT) {
  // remove big rewards
  reward = getRandomRewardFromPool(smallRewardPool);
}

// ===============================
// 🔒 RULE 1: DAILY JACKPOT CAP
// ===============================
if (reward >= 20) {
  if (dailyJackpotGiven + reward > MAX_DAILY_JACKPOT) {
    reward = getRandomRewardFromPool(smallRewardPool);
  } else {
    dailyJackpotGiven += reward;
  }
}

// ===============================
// 🔒 RULE 3: FORCED LOW REWARD AFTER BIG WIN
// ===============================
if (user.lastSpinWin && user.lastSpinWin >= 20) {
  reward = getRandomRewardFromPool(smallRewardPool);
}

    // Save reward as Decimal128
    spin.reward = mongoose.Types.Decimal128.fromString(reward.toString());
    spin.status = reward > 0 ? "Credited" : "No Win";
    await spin.save();

    // Save last big win for abuse protection
if (reward >= 20) {
  await User.updateOne(
    { userId },
    { $set: { lastSpinWin: reward } }
  );
} else {
  await User.updateOne(
    { userId },
    { $set: { lastSpinWin: 0 } }
  );
}


    // Update user wallet + stats
    await User.updateOne(
      { userId },
      {
        $inc: {
          "spins.used": 1,
          "spins.totalEarned": reward,
          spinIncome: reward,
        },
      }
    );

    // Record transaction only if reward > 0
    if (reward > 0) {
      await Transaction.create({
        userId,
        type: "spin_income",
        plan: "plan1", // default plan to satisfy schema
        amount: mongoose.Types.Decimal128.fromString(reward.toString()),
        description: `Spin reward credited: ${reward} USDT`,
      });
    }

    // ✅ Get remaining spins
    const availableSpins = await Spin.countDocuments({ userId, used: false });

    // Convert reward to number before sending to React
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
    console.error("Spin error:", err);
    return res.status(500).json({ success: false, message: "Spin failed. Server error." });
  }
});




// 📥 Buy Spins (cost = $5 each)

// 📥 Buy Spins (cost = $5 each) with transaction password check
router.post("/buy", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { quantity, transactionPassword } = req.body;
    const numSpins = parseInt(quantity) || 1;

    if (numSpins <= 0) {
      return res.status(400).json({ success: false, message: "Invalid spin quantity." });
    }

    if (!transactionPassword) {
      return res.status(400).json({ success: false, message: "Transaction password is required." });
    }

    const costPerSpin = 5;
    const totalCost = numSpins * costPerSpin;

    // Fetch user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify transaction password
    const isMatch = await bcrypt.compare(transactionPassword, user.transactionPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect transaction password." });
    }

    // Check wallet balance
    if (user.walletBalance < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You need $${totalCost}, but have only $${user.walletBalance}.`
      });
    }

    // Deduct from wallet
    user.walletBalance -= totalCost;
    await user.save();

    // Award spins
    const spins = [];
    for (let i = 0; i < numSpins; i++) {
      const spin = await Spin.create({ userId, used: false });
      spins.push(spin);
    }

    // ✅ Record transaction with default plan value
    await Transaction.create({
      userId,
      type: "buy_spin",
      plan: "plan1", // ✅ Add default plan to avoid enum validation error
      amount: -totalCost,
      description: `Bought ${numSpins} spin(s) for $${totalCost}`
    });

    const availableSpins = await Spin.countDocuments({ userId, used: false });

    return res.status(200).json({
      success: true,
      message: `Successfully purchased ${numSpins} spin(s).`,
      spent: totalCost,
      availableSpins,
      walletBalance: user.walletBalance,
      newSpins: spins,
    });
  } catch (err) {
    console.error("Buy spin error:", err);
    return res.status(500).json({ success: false, message: "Failed to buy spins. Server error." });
  }
});



// 📜 Spin History
// 📜 Get Spin History
// 📜 Get Spin History
router.get("/history", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch all used spins, sorted by the time they were actually used
    const history = await Spin.find({ userId, used: true }).sort({ usedAt: -1 });

    // Format spins for frontend
  const formattedHistory = history.map(spin => ({
  id: spin._id,
  reward: spin.reward ? parseFloat(spin.reward.toString()) : 0, // ✅ convert Decimal128
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
      rewardPool: rewardPool.map(r => r.reward), // send rewards for frontend wheel
    });
  } catch (err) {
    console.error("Spin history error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch spin history." });
  }
});






// 🎁 Admin: Award Spin
router.post("/award/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const newSpin = await Spin.create({ userId, used: false });
    return res.status(200).json({
      success: true,
      message: "Spin awarded!",
      spin: newSpin,
    });
  } catch (err) {
    console.error("Spin award error:", err);
    return res.status(500).json({ success: false, message: "Failed to award spin." });
  }
});

module.exports = router;
