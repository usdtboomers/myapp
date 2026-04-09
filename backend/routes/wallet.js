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
 

// ==========================================
// ✅ HELPER: Get Lifetime Incomes (Har type ki total earning)
// ==========================================
 

// ==========================================
// ✅ UPDATED ROUTE: Get User Wallet & Income Stats
// (Isko file mein sabse NEECHE rakho)
// ==========================================
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // 1. User validation
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Lifetime incomes nikalna (Helper function se)
    const life = await getLifetimeIncomes(userId);

    // 3. Current Plan Income calculation (Naye 10-minute logic ke basis par)
    // Hum saare active plans ki current earnings ko sum karenge
    const planKeys = ["plan1", "plan2", "plan3", "plan4", "plan5", "plan6"];
    let currentTotalPlanIncome = 0;

    planKeys.forEach(key => {
      // calculatePlanEarnings function upar file mein defined hona chahiye
currentTotalPlanIncome += calculatePackageEarnings(user.packages, key);
    });

    // 4. Final Response
    res.json({
      success: true,
      walletBalance: user.walletBalance || 0,

      // Dashboard pe dikhane ke liye real-time incomes
      directIncome: life.direct || 0,
      levelIncome:  life.level  || 0,
      // Plan income ko realtime timer wale logic se bhej rahe hain
      planIncome:   currentTotalPlanIncome || 0,
      
      // Additional data agar dashboard pe chahiye ho
      totalLifetimeIncome: (life.direct + life.level + currentTotalPlanIncome + life.spin)
    });

  } catch (err) {
    console.error("Fetch Wallet Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching wallet" });
  }
});
 
  

// ✅ BSC Settings (Mainnet)
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP-20
const SYSTEM_WALLET = process.env.PLATFORM_WALLET; // .env check karein

// Provider Setup
const provider = new ethers.JsonRpcProvider(BSC_RPC);
// ----------------------------------------------------------------------
// POST /api/wallet/web3-deposit
// Auto-Verify Transaction Hash & Credit Wallet
// ----------------------------------------------------------------------
router.post("/web3-deposit", async (req, res) => {
  try {
    const { userId, txnHash, name } = req.body;

    // 1. Validation
    if (!txnHash) return res.status(400).json({ success: false, message: "Transaction hash is required" });
    if (!SYSTEM_WALLET) return res.status(500).json({ success: false, message: "Admin wallet not configured" });

    // 2. Check Duplicate (Agar pehle process ho chuka hai)
    // Hum Transaction aur Deposit dono me check karenge
    const existingTxn = await Transaction.findOne({ txnHash });
    const existingDep = await Deposit.findOne({ txnHash });
    
    if (existingTxn || existingDep) {
      return res.status(400).json({ success: false, message: "Transaction already processed." });
    }

    console.log(`Verifying Hash: ${txnHash} for User: ${userId}`);

    // 3. Verify on Blockchain (BSC)
    const receipt = await provider.getTransactionReceipt(txnHash);

    if (!receipt) {
      return res.status(400).json({ success: false, message: "Transaction not found. Wait a few seconds." });
    }

    if (receipt.status !== 1) {
      return res.status(400).json({ success: false, message: "Transaction failed on blockchain." });
    }

    // 4. Check USDT Transfer Logs
    const iface = new ethers.utils.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
    
    let verifiedAmount = 0;
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
        try {
          const parsed = iface.parseLog(log);
          // Check Receiver matches Our Admin Wallet
          if (parsed.args.to.toLowerCase() === SYSTEM_WALLET.toLowerCase()) {
            verifiedAmount = parseFloat(ethers.utils.formatUnits(parsed.args.value, 18));
            break; 
          }
        } catch (e) {
          continue; 
        }
      }
    }

    if (verifiedAmount <= 0) {
      return res.status(400).json({ success: false, message: "No USDT transfer found to Admin Wallet." });
    }

    // 🔥🔥🔥 YE DO LINES YAHA CHIPKAO 🔥🔥🔥
    if (verifiedAmount < 10) return res.status(400).json({ success: false, message: "Minimum deposit allowed is $10." });
    if (verifiedAmount % 1 !== 0) return res.status(400).json({ success: false, message: "Decimals not allowed. Please deposit round figures only." });
    // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

    // 5. Update User
    const user = await User.findOne({ userId: Number(userId) });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 6. Save Deposit
    const deposit = new Deposit({
      userId: Number(userId),
      name: name || user.name,
      amount: verifiedAmount,
      txnHash,
      method: "USDT BEP20 (Auto)",
      status: "approved",
    });
    await deposit.save();

    // 7. Save Transaction
    const transaction = new Transaction({
      userId: Number(userId),
      type: "deposit",
      amount: verifiedAmount,
      grossAmount: verifiedAmount,
      netAmount: verifiedAmount,
      txnHash,
      description: "Web3 Deposit Verified",
      date: new Date(),
      status: "completed",
      plan: "plan1", 
    });
    await transaction.save();

    // 8. Credit Wallet
    user.walletBalance += verifiedAmount;

    // Fix ROI Plans if missing
    let updatedROI = false;
    user.dailyROI.forEach(roi => {
       if (!roi.plan) { roi.plan = "plan1"; updatedROI = true; }
    });
    if (updatedROI) await user.save();

    await user.save();

    console.log(`✅ Success: Credited ${verifiedAmount} USDT to User ${userId}`);

    res.json({
      success: true,
      message: "Deposit verified! Balance updated.",
      walletBalance: user.walletBalance,
    });

  } catch (err) {
    console.error("Auto-Verify Error:", err);
    res.status(500).json({ success: false, message: "Server error during verification." });
  }
});

 



 

 
// 🧾 GET /wallet/deposit-history/:userId

router.get('/deposit-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const numericUserId = Number(userId);

    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const deposits = await Deposit.find({ userId: numericUserId }).sort({ createdAt: -1 });
    res.json(deposits);
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

// 🔹 Run binary matching for eligible users only
 




 




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
    if (amt < 10) return res.status(400).json({ message: "Minimum transfer amount is $10" });

    if (amt % 1 !== 0) return res.status(400).json({ message: "Decimals not allowed. Please enter round figure." });

    // 🔥 PROMO USER LOGIC START (Bypass Team Check & Balance Check) 🔥
    if (sender.role === "promo") {
      return res.json({ message: 'Transfer successful (Promo Mode)' });
    }
    // 🔥 PROMO USER LOGIC END 🔥

    // ============================================
    // 🛡️ NORMAL USER CHECKS START
    // ============================================

    // 1. Password Check (FIXED: changed 'user' to 'sender')
    const isPasswordValid = (transactionPassword === sender.transactionPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid transaction password' });
    }

    // 2. Balance Check
    if (sender.walletBalance < amt) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 3. 🔥 TEAM CHECK (DOWNLINE ONLY) 🔥
    // Logic: Receiver ke upar check karte jao, kya Sender unka Upline hai?
    let isDownline = false;
    let currentSponsorId = receiver.sponsorId;
    let safetyCounter = 0; // Infinite loop se bachne ke liye

    while (currentSponsorId && safetyCounter < 50) { // Max 50 levels up check karega
      if (currentSponsorId === sender.userId) {
        isDownline = true;
        break;
      }
      
      // Agla upline user dhundo
      const uplineUser = await User.findOne({ userId: currentSponsorId });
      if (!uplineUser) break; // Chain khatam
      
      currentSponsorId = uplineUser.sponsorId;
      safetyCounter++;
    }

    // Agar Receiver aapki team me nahi hai, to error do
    if (!isDownline) {
      return res.status(403).json({ 
        message: 'Transfer Restricted: You can only transfer funds to your Downline Team members.' 
      });
    }

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



  


// ==========================================
// ✅ UPDATED ROUTE: Get User Wallet & Income Stats
// ==========================================
    // ... rest of your existing route code ...
// ==========================================
// 1. UPDATED WITHDRAWABLE API (Directs removed)
// ==========================================
// ==========================================
// 1. UPDATED WITHDRAWABLE API 
// ==========================================
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
router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    const { amount, source, transactionPassword, package: packageAmount, level } = req.body;
    const amt = Math.floor(parseFloat(amount));

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🛡️ User must have an active ID to withdraw
    if (!user.isToppedUp) return res.status(400).json({ message: "You need an Active ID (Top-up required)." });
    
    const isPasswordValid = (transactionPassword === user.transactionPassword);
    if (!isPasswordValid) return res.status(403).json({ message: "Invalid Transaction Password." });

    if (amt <= 0) return res.status(400).json({ message: "Invalid amount." });

    // ✅ UPDATE: Minimum withdrawal limit set to $5
    if (amt < 5) return res.status(400).json({ message: "Minimum withdrawal amount is $5." });

    const isOtherIncome = ["direct", "level", "reward", "spin", "pool"].includes(source);
    let finalSourceForDB = source;

    if (isOtherIncome) {
      // Find dynamic balance field (e.g. rewardIncome)
      const balanceField = `${source}Income`; 
      
      if ((user[balanceField] || 0) < amt) {
        return res.status(400).json({ message: `Insufficient balance in ${source.toUpperCase()} wallet.` });
      }

      // Deduct Balance
      user[balanceField] -= amt;
      user.totalWithdrawn = (user.totalWithdrawn || 0) + amt;
      finalSourceForDB = source;

    } else {
      // 📦 LOGIC FOR PACKAGE (POOL) WITHDRAWAL
      const pkg = user.packages && user.packages.find(p => p.plan === source);
      if (!pkg) return res.status(400).json({ message: "This package is not currently active." });
      if (level === undefined) return res.status(400).json({ message: "Invalid Request: Level missing." });

      const pkgAmt = parseFloat(packageAmount);
      
      // Note: Ensure your 'packageEarnings' object has an array defined for the '10' key.
      const earningsArray = packageEarnings[pkgAmt];
      
      const { isUnlocked, timeLeft } = getLevelUnlockData(pkg, level);
      if (!isUnlocked) {
        return res.status(400).json({ message: `Level is locked. Wait for the timer to complete.` });
      }

      // Check balance availability 
      let withdrawnTotal = user.pendingWithdrawals?.[source] || 0;
      let totalAvailable = 0;
      for (let i = 0; i <= level; i++) {
        const used = Math.min(withdrawnTotal, earningsArray[i]);
        withdrawnTotal -= used;
        totalAvailable += (earningsArray[i] - used);
      }

      if (amt > totalAvailable) {
          return res.status(400).json({ message: `Requested amount exceeds available Level balance.` });
      }

      user.pendingWithdrawals = user.pendingWithdrawals || {};
      user.pendingWithdrawals[source] = (user.pendingWithdrawals[source] || 0) + amt;
      user.totalWithdrawn = (user.totalWithdrawn || 0) + amt;
      finalSourceForDB = source; 
    }

    await user.save();

    await Withdrawal.create({
      userId: user.userId,
      source: finalSourceForDB, 
      grossAmount: amt,
      fee: amt * 0.10, // 10% deduction on all withdrawals
      netAmount: amt * 0.90,
      walletAddress: user.walletAddress,
      status: "pending",
      date: new Date()
    });

    await Transaction.create({
      userId: user.userId,
      type: "withdrawal",
      source: finalSourceForDB, 
      amount: amt,
      description: `Withdrawal from ${source.toUpperCase()}`,
      status: "pending"
    });

    return res.json({ success: true, message: `Withdrawal request for $${amt} submitted.` });

  } catch (err) {
    console.error("Withdraw Error:", err);
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
// Optional: Paginated withdrawal history
// ---------------------------
 






// ---------------------------
// CREDIT TO WALLET ROUTE
// Atomic and safe
// ---------------------------
// ---------------------------
// CREDIT TO WALLET ROUTE (UPDATED FOR REWARD & POOL ONLY)
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

      // ✅ Total
      const totalAmount = dReward + dPool + dDirect;

      // 🛑 Validation
      if (totalAmount < 5) {
        return res.status(400).json({ message: `Minimum credit amount is $5. You entered $${totalAmount}.` });
      }

      if (totalAmount % 1 !== 0) {
        return res.status(400).json({ message: "Decimals not allowed. Please enter round figure." });
      }

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
      if (transactionPassword !== user.transactionPassword) {
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

      // Reward deduct
      if (dReward > 0) {
        user.rewardIncome -= dReward;
      }

      // Direct deduct ✅
      if (dDirect > 0) {
        user.directIncome -= dDirect;
      }

      // Pool deduct
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

      // Wallet add
      user.walletBalance += totalAmount;

      await user.save();

      // Transaction log
      const txn = await Transaction.create({
        userId: user.userId,
        type: "credit_to_wallet",
        source: finalSource,
        amount: totalAmount,
        grossAmount: totalAmount,
        netAmount: totalAmount,
        fee: 0,
        description: `Credited $${totalAmount} (${activeSources.join(" + ")})`,
        status: "completed",
        date: new Date(),
      });

      res.json({
        success: true,
        message: `Successfully credited $${totalAmount}`,
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
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // 1. User validation
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Lifetime incomes nikalna (Helper function se jisme ab reward bhi hai)
    const life = await getLifetimeIncomes(userId);

    // 3. Current Plan Income calculation (Naye 10-minute logic ke basis par)
    const planKeys = ["plan1", "plan2", "plan3", "plan4", "plan5", "plan6"];
    let currentTotalPlanIncome = 0;

    planKeys.forEach(key => {
      currentTotalPlanIncome += calculatePackageEarnings(user.packages, key);
    });

    // 4. Final Response
    res.json({
      success: true,
      walletBalance: user.walletBalance || 0,

      // Dashboard pe dikhane ke liye real-time incomes (Total based on History)
      totalDirectIncome: life.direct || 0,
      totalLevelIncome:  life.level  || 0,
      totalSpinIncome:   life.spin   || 0,
      totalRewardIncome: life.reward || 0, // ✅ Naya param jo UI catch karega
      planIncome:        currentTotalPlanIncome || 0,
      
      // ✅ Original current values (For withdrawals checks inside UI)
      directIncome: user.directIncome || 0,
      levelIncome:  user.levelIncome || 0,
      spinIncome:   user.spinIncome || 0,
      rewardIncome: user.rewardIncome || 0, 

      // Additional data agar dashboard pe chahiye ho
      totalLifetimeIncome: (life.direct + life.level + currentTotalPlanIncome + life.spin + life.reward)
    });

  } catch (err) {
    console.error("Fetch Wallet Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching wallet" });
  }
});

module.exports = router;
