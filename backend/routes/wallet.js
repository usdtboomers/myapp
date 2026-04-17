const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
 const TopUp = require('../models/TopUp');
const Package = require('../models/Package');
const ethers = require("ethers"); // ✅ add this
 
 
 const authMiddleware = require("../middleware/authMiddleware"); // sets req.user
const checkFeature = require("../middleware/checkFeatureEnabled");
// Helper: Get Settings
const getSettings = async () => await Setting.findOne();
// 🔹 Get Wallet Balance
// ✅ Fetch wallet balance
// GET /api/wallet/:userId



router.get("/admin-address", (req, res) => {
  const address = process.env.PLATFORM_WALLET;
  res.json({ address });
});

 


 
 

 


// ==========================================
// ✅ HELPER: Get Lifetime Incomes (Har type ki total earning)
// ==========================================
 

// ==========================================
// ✅ HELPER: Get Lifetime Incomes (Har type ki total earning)
// ==========================================
const getLifetimeIncomes = async (userId) => {
  const numericId = Number(userId);

  // Fetch sum of all incomes from Transaction history (Added "reward_income")
  const txns = await Transaction.find({
    userId: numericId,
    type: { $in: ["direct_income", "level_income", "plan_income", "spin_income", "binary_income", "reward_income"] },
  });

  let direct = 0;
  let level  = 0;
  let plan   = 0;
  let spin   = 0;
  let binary = 0;
  let reward = 0; // Naya variable reward ke liye

  for (const t of txns) {
    const amt = t.amount ? parseFloat(t.amount.toString()) : 0;
    if (t.type === "direct_income")  direct += amt;
    if (t.type === "level_income")   level  += amt;
    if (t.type === "plan_income")    plan   += amt;
    if (t.type === "spin_income")    spin   += amt;
    if (t.type === "binary_income")  binary += amt;
    if (t.type === "reward_income")  reward += amt; // Reward amount jodo
  }

  return { direct, level, plan, spin, binary, reward };
};


const packageEarnings = {
    10: [2, 3, 5, 5, 5],
  30: [5, 10, 15, 15, 15],
  60: [10, 20, 30, 30, 30],
  120: [20, 40, 60, 60, 60],
  240: [40, 80, 120, 120, 120],
  480: [80, 160, 240, 240, 240],
  960: [160, 320, 480, 480, 480]
};

const unlockDays = [3, 13, 43, 73, 103];

// ✅ NEW FUNCTION
const calculatePackageEarnings = (packages, planKey) => {
  const filtered = (packages || []).filter(p => p.plan === planKey);
  let total = 0;

  filtered.forEach(pkg => {
    const earningsArray = packageEarnings[pkg.amount];
    if (!earningsArray) return;

    const diffDays = Math.floor((Date.now() - new Date(pkg.startDate)) / (1000 * 60 * 60 * 24));

    if (diffDays >= unlockDays[0]) total += earningsArray[0];
    if (diffDays >= unlockDays[1]) total += earningsArray[1];
    if (diffDays >= unlockDays[2]) total += earningsArray[2];
    if (diffDays >= unlockDays[3]) total += earningsArray[3];
    if (diffDays >= unlockDays[4]) total += earningsArray[4];
  });

  return total;
};
 

// ✅ NEW FUNCTION: Check if a specific level is unlocked for withdrawal
const getLevelUnlockData = (pkg, level) => {
  // Check how many days have passed since the package was bought
  const diffDays = Math.floor((Date.now() - new Date(pkg.startDate)) / (1000 * 60 * 60 * 24));
  
  // Get required days from the unlockDays array based on the level requested (0 to 4)
  const requiredDays = unlockDays[level];

  // If level is invalid
  if (requiredDays === undefined) {
    return { isUnlocked: false, timeLeft: "Invalid Level" };
  }

  const isUnlocked = diffDays >= requiredDays;
  let timeLeft = "";

  if (!isUnlocked) {
    const daysLeft = requiredDays - diffDays;
    timeLeft = `${daysLeft} days remaining`;
  }

  return { isUnlocked, timeLeft };
};

 
 
// 🧾 GET /wallet/deposit-history/:userId
router.get('/deposit-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const numericUserId = Number(userId);

    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const deposits = await Deposit.find({ userId: numericUserId }).sort({ createdAt: -1 });
    res.json(deposits); // ✅ Backend directly array return kar raha hai []
  } catch (err) {
    console.error('Error fetching deposit history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// 🔹 Wallet Transfer
const bcrypt = require('bcrypt');

 
 

// 🔹 Calculate total withdrawn from DB
async function getTotalWithdrawn(userId) {
  const result = await Withdrawal.aggregate([
    { $match: { userId, status: { $in: ["completed", "processed"] } } },
    { $group: { _id: null, total: { $sum: "$grossAmount" } } }
  ]);
  return result[0]?.total || 0;
}

 



router.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, transactionPassword } = req.body;

    const settings = await getSettings();
    if (!settings?.allowWalletTransfer) {
      return res.status(403).json({ message: 'Transfers are currently disabled in the system' });
    }

    const [sender, receiver] = await Promise.all([
      User.findOne({ userId: Number(fromUserId) }),
      User.findOne({ userId: Number(toUserId) }),
    ]);

    if (!sender) return res.status(404).json({ message: 'Sender not found' });
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    const amt = Number(amount);
    
    // 🔥 LIMIT CHANGED: Ab minimum $5 ka transfer ho sakta hai
    if (amt < 5) return res.status(400).json({ message: "Minimum transfer amount is $5" });

    if (amt % 1 !== 0) return res.status(400).json({ message: "Decimals not allowed. Please enter round figure." });

    // 🔥 PROMO USER LOGIC START
    if (sender.role === "promo") {
      return res.json({ message: 'Transfer successful (Promo Mode)' });
    }
    // 🔥 PROMO USER LOGIC END

    // ============================================
    // 🛡️ NORMAL USER CHECKS START
    // ============================================

    // 1. Password Check (Capital/Small issue fixed)
    const isPasswordValid = (transactionPassword.toLowerCase() === sender.transactionPassword.toLowerCase());
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid transaction password' });
    }

    // 2. Balance Check
    if (sender.walletBalance < amt) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 🔥 DOWNLINE CHECK REMOVED: Ab kisi ko bhi (anywhere) transfer ho sakta hai!

    // ============================================
    // 💸 TRANSFER EXECUTION
    // ============================================
    sender.walletBalance -= amt;
    receiver.walletBalance += amt;

    await sender.save();
    await receiver.save();

    await Transaction.create({
      userId: sender.userId,
      type: 'transfer',
      fromUserId: sender.userId,
      toUserId: receiver.userId,
      amount: amt,
      grossAmount: amt,
      description: `Transfer from ${sender.userId} to ${receiver.userId}`,
    });

    res.json({ message: 'Transfer successful' });

  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ message: 'Transfer failed' });
  }
});



  

 
// 1. GET WITHDRAWABLE BALANCE API
// ==========================================
router.get("/withdrawable/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const planBalances = {};
    // ✅ UPDATE: "plan0" (for $10 package) is added here
    const planKeys = ["plan0", "plan1", "plan2", "plan3", "plan4", "plan5", "plan6"];

    planKeys.forEach(planKey => {
      const activePkg = user.packages && user.packages.find(p => p.plan === planKey);
      if (!activePkg) {
        planBalances[planKey] = 0;
        return;
      }

      // Everyone gets the generated income calculated strictly by time
      const systemEarned = calculatePackageEarnings(user.packages, planKey);
      const alreadyWithdrawn = user.pendingWithdrawals?.[planKey] || 0;
      planBalances[planKey] = Math.max(parseFloat((systemEarned - alreadyWithdrawn).toFixed(2)), 0);
    });

    res.json({
      walletBalance: user.walletBalance || 0,
      planIncomes: planBalances,
      direct: user.directIncome || 0, 
      level: user.levelIncome || 0,   
      reward: user.rewardIncome || 0, 
      spin: user.spinIncome || 0,
      isUserToppedUp: user.isToppedUp
    });

  } catch (err) {
    console.error("Withdrawable Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ==========================================
// 2. UPDATED WITHDRAW POST API 
// ==========================================
// ==========================================
// 2. UPDATED WITHDRAW POST API 
// ==========================================
// Purana router.post("/withdraw"...) delete karke ye naya wala paste karo:

router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    // 🔥 CHANGE: Ab hum single amount ki jagah 'items' ka array lenge.
    // Frontend se aayega: { transactionPassword: "xxx", items: [{source: "direct", amount: 3}, {source: "plan0", package: 10, level: 1, amount: 2}] }
    const { items, transactionPassword } = req.body;

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🛡️ BASIC CHECKS (Top-up & Password)
    if (!user.isToppedUp) return res.status(400).json({ message: "You need an Active ID (Top-up required)." });
    
    const isPasswordValid = (transactionPassword.toLowerCase() === user.transactionPassword.toLowerCase());
    if (!isPasswordValid) return res.status(403).json({ message: "Invalid Transaction Password." });

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No withdrawal items provided." });
    }

    // 💰 CALCULATE TOTAL AMOUNT
    let totalAmt = 0;
    for (let item of items) {
      totalAmt += Math.floor(parseFloat(item.amount));
    }
    // $5 Minimum Check
    if (totalAmt < 5) {
        return res.status(400).json({ message: "Minimum total withdrawal amount is $5." });
    }

    // =========================================================
    // 🔥 STEP 1: PRE-CHECK LOGIC (ALL OR NOTHING GATEKEEPER)
    // =========================================================
    // Ye loop sirf check karega, database se kuch nahi katega.
    let simPending = { ...(user.pendingWithdrawals || {}) };
    let simWallets = {}; 

    for (let item of items) {
      const amt = Math.floor(parseFloat(item.amount));
      if (amt <= 0) return res.status(400).json({ message: "Invalid amount detected." });

      const isOtherIncome = ["direct", "level", "reward", "spin", "pool", "usdt"].includes(item.source);

      if (isOtherIncome) {
        const balanceField = `${item.source}Income`; 
        simWallets[balanceField] = simWallets[balanceField] !== undefined ? simWallets[balanceField] : (user[balanceField] || 0);

        if (simWallets[balanceField] < amt) {
          return res.status(400).json({ message: `Insufficient balance in ${item.source.toUpperCase()} wallet.` });
        }
        simWallets[balanceField] -= amt; // Simulate deduction

      } else {
        // 📦 PACKAGE & LEVEL CHECKS
        const pkgAmt = parseFloat(item.package);

        // $10 Package Rule
        if (pkgAmt === 10) {
          const userTopUpAmount = parseFloat(user.topUpAmount || 0);
          if (userTopUpAmount < 30) {
            return res.status(400).json({ message: "To withdraw from the $10 package, you must have an active Top-up of at least $30." });
          }
        }

        const pkg = user.packages && user.packages.find(p => p.plan === item.source);
        if (!pkg) return res.status(400).json({ message: `Package ${item.source} is not active.` });
        if (item.level === undefined) return res.status(400).json({ message: `Level missing for package ${item.source}.` });

        // Ensure packageEarnings and getLevelUnlockData exist in your scope
        const earningsArray = packageEarnings[pkgAmt];
        const { isUnlocked } = getLevelUnlockData(pkg, item.level);
        if (!isUnlocked) return res.status(400).json({ message: `Level ${item.level} is locked for ${item.source}. Wait for the timer to complete.` });

        // Calculate Available Balance for this Level
        let withdrawnTotal = simPending[item.source] || 0;
        let totalAvailable = 0;
        for (let i = 0; i <= item.level; i++) {
          const used = Math.min(withdrawnTotal, earningsArray[i]);
          withdrawnTotal -= used;
          totalAvailable += (earningsArray[i] - used);
        }

        if (amt > totalAvailable) {
          return res.status(400).json({ message: `Amount exceeds available Level balance in ${item.source}.` });
        }

        // Add to simulated pending so next loop iteration (if same package) sees correct balance
        simPending[item.source] = (simPending[item.source] || 0) + amt;
      }
    }

    // =========================================================
    // 🔥 STEP 2: REAL DEDUCTION & DATABASE UPDATE
    // =========================================================
    // Agar ek bhi error hota, toh code yahan tak nahi aata. Ab safe hai paise katna.
    
    for (let item of items) {
      const amt = Math.floor(parseFloat(item.amount));
      const isOtherIncome = ["direct", "level", "reward", "spin", "pool", "usdt"].includes(item.source);

      if (isOtherIncome) {
        const balanceField = `${item.source}Income`; 
        user[balanceField] -= amt;
      } else {
        user.pendingWithdrawals = user.pendingWithdrawals || {};
        user.pendingWithdrawals[item.source] = (user.pendingWithdrawals[item.source] || 0) + amt;
      }

      user.totalWithdrawn = (user.totalWithdrawn || 0) + amt;

      // Withdrawal Record create karna
      await Withdrawal.create({
        userId: user.userId,
        source: item.source, 
        grossAmount: amt,
        fee: amt * 0.10, // 10% deduction
        netAmount: amt * 0.90,
        walletAddress: user.walletAddress,
        status: "pending",
        date: new Date()
      });

      // Transaction History create karna
      await Transaction.create({
        userId: user.userId,
        type: "withdrawal",
        source: item.source, 
        amount: amt,
        description: `Withdrawal from ${item.source.toUpperCase()}`,
        status: "pending"
      });
    }

    // Saare changes ek sath DB me save kardo
    await user.save();

    return res.json({ success: true, message: `Withdrawal request for $${totalAmt} submitted successfully.` });

  } catch (err) {
    console.error("Withdraw Error:", err);
    res.status(500).json({ message: "Server processing error." });
  }
});

 


// 🔥 Naya Dedicated Route: Sirf Promo Users ke liye
// 🔥 Dedicated Route: Sirf Promo Simulation ke liye
router.post("/promo-withdraw", authMiddleware, async (req, res) => {
  try {
    const { items, transactionPassword } = req.body;

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🛡️ Role Security Check
    if (user.role !== "promo") {
      return res.status(403).json({ message: "Unauthorized: For promo users only." });
    }

    // Password Validation
    const isPasswordValid = (transactionPassword.toLowerCase() === user.transactionPassword.toLowerCase());
    if (!isPasswordValid) return res.status(403).json({ message: "Invalid Transaction Password." });

    // 💰 Calculation (Sirf response message ke liye)
    let totalAmt = 0;
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        totalAmt += Math.floor(parseFloat(item.amount) || 0);
      });
    }

    // =========================================================
    // 🚫 NO DATABASE CHANGES
    // =========================================================
    // Humne 'user.save()' aur 'Withdrawal.create' sab hata diya hai.
    // Isliye balance minus NAHI hoga aur record bhi NAHI banega.
    // =========================================================

    return res.json({ 
      success: true, 
      message: `Promo withdrawal of $${totalAmt} processed (Bypassed & No balance deduction).` 
    });

  } catch (err) {
    console.error("Promo Withdraw Simulation Error:", err);
    res.status(500).json({ message: "Server processing error." });
  }
});


router.get('/wallet-history/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Fetch transactions but ignore topup with "PROMOTION"
    const txs = await Transaction.find({
      userId,
      $or: [
        { type: { $in: ['deposit', 'transfer'] } },
        { 
          type: 'topup',
          description: { $exists: true, $ne: null, $not: /PROMOTION/i } // ignore promo topups
        }
      ]
    }).sort({ date: -1 });

    res.json({ success: true, history: txs });
  } catch (err) {
    console.error("Wallet history error:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


 
// ---------------------------
router.post(
  "/credit-to-wallet",
  authMiddleware,
  checkFeature("allowCreditToWallet"),
  async (req, res) => {
    try {
      let { 
        userId,
        transactionPassword,
        deductReward = 0,
        deductDirect = 0, // ✅ added
        deductPool = 0
      } = req.body;

      // ✅ Convert to numbers
      const dReward = parseFloat(deductReward) || 0;
      const dPool = parseFloat(deductPool) || 0;
      const dDirect = parseFloat(deductDirect) || 0; // ✅ FIX (missing tha)

      // ✅ Total Calculation
      const totalAmount = dReward + dPool + dDirect;

      // 🛑 Validation
      if (totalAmount < 5) {
        return res.status(400).json({ message: `Minimum credit amount is $5. You entered $${totalAmount}.` });
      }

      if (totalAmount % 1 !== 0) {
        return res.status(400).json({ message: "Decimals not allowed. Please enter round figure." });
      }

      // 🔥 10% Deduction Logic
      const fee = totalAmount * 0.10; // 10% katega
      const netAmount = totalAmount - fee; // Wallet mein bacha hua 90% add hoga

      // 🔥 Source detect
      let activeSources = [];
      if (dReward > 0) activeSources.push("reward");
      if (dPool > 0) activeSources.push("pool");
      if (dDirect > 0) activeSources.push("direct"); // ✅ added

      if (activeSources.length === 0) {
        return res.status(400).json({ message: "Please enter an amount to credit." });
      }

      const finalSource = activeSources.length === 1 ? activeSources[0] : "mixed";

      const user = await User.findOne({ userId: Number(userId) });
      if (!user) return res.status(404).json({ message: "User not found" });

      // 🔐 Password check
      if (transactionPassword.toLowerCase() !== user.transactionPassword.toLowerCase()) {
        return res.status(400).json({ message: "Invalid transaction password" });
      }

      const settings = await Setting.findOne({});
      if (!settings?.allowTopUps) {
        return res.status(403).json({ message: "Credit to wallet disabled by admin" });
      }

      // 🛑 Reward check
      if ((user.rewardIncome || 0) < dReward) {
        return res.status(400).json({ message: "Insufficient Reward Income" });
      }

      // 🛑 Direct check ✅
      if ((user.directIncome || 0) < dDirect) {
        return res.status(400).json({ message: "Insufficient Direct Income" });
      }

      // 🛑 Pool check
      let totalPoolAvailable = 0;
      const availablePerPlan = {};
      const planKeys = ["plan1", "plan2", "plan3", "plan4", "plan5", "plan6"];

      if (dPool > 0) {
        planKeys.forEach(planKey => {
          const pkg = user.packages.find(p => p.plan === planKey);
          if (!pkg) return;

          const earned = calculatePackageEarnings(user.packages, planKey);
          const withdrawn = user.pendingWithdrawals?.[planKey] || 0;
          const available = Math.max(0, earned - withdrawn);

          totalPoolAvailable += available;
          availablePerPlan[planKey] = available;
        });

        if (dPool > totalPoolAvailable) {
          return res.status(400).json({
            message: `Insufficient Pool Income. Available: $${totalPoolAvailable}`
          });
        }
      }

      // =========================
      // 🔥 EXECUTION
      // =========================

      // Reward deduct (Gross amount katega)
      if (dReward > 0) {
        user.rewardIncome -= dReward;
      }

      // Direct deduct ✅ (Gross amount katega)
      if (dDirect > 0) {
        user.directIncome -= dDirect;
      }

      // Pool deduct (Gross amount katega)
      if (dPool > 0) {
        let remaining = dPool;
        user.pendingWithdrawals = user.pendingWithdrawals || {};

        for (let key of planKeys) {
          if (remaining <= 0) break;

          if (availablePerPlan[key] > 0) {
            const deduct = Math.min(availablePerPlan[key], remaining);
            user.pendingWithdrawals[key] = (user.pendingWithdrawals[key] || 0) + deduct;
            remaining -= deduct;
          }
        }
      }

      // Wallet add (Sirf Net Amount add hoga 10% katne ke baad)
      user.walletBalance += netAmount;

      await user.save();

      // Transaction log
    // Transaction log
      const txn = await Transaction.create({
        userId: user.userId,
        type: "credit_to_wallet",
        source: finalSource,
        amount: netAmount,         // ✅ FIX 1: Ab history mein 10% katne ke baad wala amount ($4.50) aayega
        grossAmount: totalAmount,  
        netAmount: netAmount,      
        fee: fee,                  
        walletBalance: user.walletBalance, // ✅ FIX 2: Exact updated wallet balance database me save hoga taaki aakhiri column sahi aaye
        description: `Credited $${netAmount} after 10% fee (${activeSources.join(" + ")})`,
        status: "completed",
        date: new Date(),
      });

      res.json({
        success: true,
        message: `Successfully credited $${netAmount} after 10% deduction`,
        walletBalance: user.walletBalance,
        transaction: txn,
      });

    } catch (err) {
      console.error("Credit-to-wallet error:", err);
      res.status(500).json({ message: "Server processing error" });
    }
  }
);


// ---------------------------
// INSTANT WITHDRAW ROUTE
// For direct, level, spin only with fee
// Atomic and race-condition safe
// ---------------------------
 





// 🔹 GET specific withdrawal history for a user
router.get('/withdrawals/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    // Withdrawal model se data fetch karega
    const withdrawals = await Withdrawal.find({ userId }).sort({ date: -1 });
    
    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error("Withdrawal history error:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔹 Get Transaction History
router.get('/history/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const txns = await Transaction.find({
      $or: [
        { userId },          // normal transactions
        { toUserId: userId }, // incoming transfers
      ],
    }).sort({ createdAt: -1 });

    res.json(txns);
  } catch (err) {
    console.error("Transaction history error:", err);
    res.status(500).json({ message: 'Transaction history error' });
  }
});


// 🔹 Get Withdrawal History
 



// GET /api/wallet/topup-history/:userId
// GET /api/wallet/topup-history/:userId
router.get("/topup-history/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId); // ensure numeric

    // Fetch only actual top-ups for the user
    const topups = await Transaction.find({ 
      userId, 
      type: "topup" // updated to match new schema
    }).sort({ createdAt: -1 }); // latest first

    res.json(topups); // return array of top-up transactions
  } catch (err) {
    console.error("Top-up history error:", err);
    res.status(500).json({ message: "Failed to fetch top-up history" });
  }
});




// ==========================================
// ✅ UPDATED ROUTE: Get User Wallet & Income Stats
// (Isko file mein sabse NEECHE rakho)
// ==========================================
// ✅ FINAL ROUTE: Get User Wallet & Income Stats
// (Isko file mein sabse NEECHE rakho)
// ==========================================
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // 1. User validation
    const user = await User.findOne({ userId }).select('-password -txnPassword -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🔥 FIX FOR OLD DATA: Agar database me totalRewardIncome nahi hai, toh add kar do
    if (!user.totalRewardIncome && user.rewardIncome > 0) {
        user.totalRewardIncome = user.rewardIncome;
        await user.save(); // Data hamesha ke liye save ho jayega
    }

    // 2. Lifetime incomes nikalna (Helper function se jisme ab reward history bhi hai)
    const life = await getLifetimeIncomes(userId);

    // 3. Current Plan Income calculation
    const planKeys = ["plan1", "plan2", "plan3", "plan4", "plan5", "plan6"];
    let currentTotalPlanIncome = 0;

    planKeys.forEach(key => {
      currentTotalPlanIncome += calculatePackageEarnings(user.packages, key);
    });

    // 4. Final Response (Frontend ko yahi format chahiye)
    res.json({
      success: true,
      user: user, // Frontend ko Global Growth calculate karne ke liye user chahiye
      walletBalance: user.walletBalance || 0,
      
      // ✅ DASHBOARD LIFETIME TOTALS (Kabhi minus nahi honge)
      income: {
         totalDirectIncome: life.direct || user.totalDirectIncome || user.directIncome || 0,
         totalLevelIncome:  life.level  || user.levelIncome || 0,
         totalSpinIncome:   life.spin   || user.spinIncome || 0,
         totalRewardIncome: life.reward || user.totalRewardIncome || user.rewardIncome || 0,
         planIncome:        currentTotalPlanIncome || 0
      },

      // ✅ WITHDRAWAL KE LIYE CURRENT BALANCE (Jo minus hota hai)
      directIncome: user.directIncome || 0,
      levelIncome:  user.levelIncome || 0,
      spinIncome:   user.spinIncome || 0,
      rewardIncome: user.rewardIncome || 0, 

      totalLifetimeIncome: (life.direct + life.level + currentTotalPlanIncome + life.spin + life.reward)
    });

  } catch (err) {
    console.error("Fetch Wallet Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching wallet" });
  }
});

module.exports = router;