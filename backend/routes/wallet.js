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
const Spin = require("../models/Spin");


 const authMiddleware = require("../middleware/authMiddleware"); // sets req.user
const checkFeature = require("../middleware/checkFeatureEnabled");
// Helper: Get Settings
const getSettings = async () => await Setting.findOne();
// 🔹 Get Wallet Balance
// ✅ Fetch wallet balance
// GET /api/wallet/:userId


// 🔹 Helper: Calculate Available Incomes
// ---------------------------
// HELPER: Calculate Available Incomes
// ---------------------------
// HELPER: Calculate Available Incomes per plan
// ---------------------------
// ---------------------------
// HELPER: Calculate Available Incomes per user
// ---------------------------
// 🔹 Helper: Calculate available incomes per plan (per purchase)
// Helper: get available incomes (direct, level, spin, plans)
// Pre-calc balances assumed stored in user object
// ---------------------------
 // Calculate plan balance based on claimed days and pending withdrawals

// Helper: calculate available plan balance from dailyROI
const calculatePlanBalanceByClaimedDays = (user) => {
  const balances = { plan1: 0, plan2: 0, plan3: 0, plan4: 0, plan5: 0, plan6: 0, plan7: 0  };
  if (!user.dailyROI) return balances;

  user.dailyROI.forEach(plan => {
    const remainingDays = plan.maxDays - plan.claimedDays;
    if (remainingDays > 0) {
      balances[plan.plan] += plan.amount * remainingDays;
    }
  });

  return balances;
};

// Updated getAvailableIncomes
const getAvailableIncomes = async (userId) => {
  const user = await User.findOne({ userId: Number(userId) });
  if (!user) return { planIncome: { plan1:0, plan2:0, plan3:0, plan4:0 ,plan5:0 , plan6:0 , plan7:0  }, direct:0, level:0, spin:0, topupBonus:0 };

  const planIncome = calculatePlanBalanceByClaimedDays(user);

  return {
    planIncome,
    direct: user.directIncome || 0,
    level: user.levelIncome || 0,
    spin: user.spinIncome || 0,
   };
};


// 🔹 Simple helper: get available direct / level / spin incomes
const getAvailableIncomesFixed = async (userId) => {
  const user = await User.findOne({ userId: Number(userId) });
  if (!user) {
    return { direct: 0, level: 0, spin: 0 };
  }

  return {
    direct: user.directIncome || 0,
    level:  user.levelIncome  || 0,
    spin:   user.spinIncome   || 0,
        binary: user.binaryIncome || 0, // ✅ added

  };
};






// 🔹 Lifetime incomes from Transaction collection (no withdraw minus)
const getLifetimeIncomes = async (userId) => {
  const numericId = Number(userId);

  const txns = await Transaction.find({
    userId: numericId,
    type: { $in: ["direct_income", "level_income", "plan_income", "spin_income"] },
  });

  let direct = 0;
  let level  = 0;
  let plan   = 0;
  let spin   = 0;

  for (const t of txns) {
    const amt = t.amount
      ? parseFloat(t.amount.toString())
      : 0;

    if (t.type === "direct_income")  direct += amt;
    if (t.type === "level_income")   level  += amt;
    if (t.type === "plan_income")    plan   += amt;
    if (t.type === "spin_income")    spin   += amt;
  }

  return { direct, level, plan, spin };
};


router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ⭐ Lifetime incomes (jaise pehle banaya tha)
    const life = await getLifetimeIncomes(userId);

    // ⭐ Yaha se sahi available spins
    const availableSpins = await Spin.countDocuments({ userId, used: false });

    res.json({
      success: true,
      walletBalance: user.walletBalance || 0,

      // Lifetime totals
      directIncome: life.direct,
      levelIncome:  life.level,
      planIncome:   life.plan,
      spinIncome:   life.spin,

      availableSpins,   // ✅ yaha ab sahi value aayegi
    });

  } catch (err) {
    console.error("Fetch Wallet Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching wallet" });
  }
});


 

// POST /api/wallet/web3-deposit
// Records deposit from frontend
// POST /api/wallet/web3-deposit
// Records deposit from frontend
// POST /api/wallet/web3-deposit
// Records deposit from frontend
 

// ---------------------------
// POST /api/wallet/web3-deposit
// Records a web3 deposit
// ---------------------------
// POST /api/wallet/web3-deposit
router.post("/web3-deposit", async (req, res) => {
  try {
    const { userId, amount, txnHash, method, name } = req.body;

    // Prevent duplicate deposit
    const existingTransaction = await Transaction.findOne({ txnHash });
    const existingDeposit = await Deposit.findOne({ txnHash });
    if (existingTransaction || existingDeposit) {
      return res.json({ success: true, message: "Deposit already recorded" });
    }

    // Fetch user
    const user = await User.findOne({ userId: Number(userId) });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // -------------------------------
    // Fix old dailyROI entries without plan
    // -------------------------------
    let updatedROI = false;
    user.dailyROI.forEach(roi => {
      if (!roi.plan) {
        roi.plan = "plan1"; // assign default plan
        updatedROI = true;
      }
    });
    if (updatedROI) await user.save();

    // -------------------------------
    // Save Deposit
    // -------------------------------
    const deposit = new Deposit({
      userId: Number(userId),
      name: name || user.name,
      amount: Number(amount),
      txnHash,
      method: method || "Web3",
      status: "approved",
    });
    await deposit.save();

    // -------------------------------
    // Save Transaction
    // -------------------------------
    const transaction = new Transaction({
      userId: Number(userId),
      type: "deposit",
      amount: Number(amount),
      grossAmount: Number(amount),
      netAmount: Number(amount),
      txnHash,
      description: "Web3 deposit",
      date: new Date(),
      plan: "plan1", // ✅ assign valid enum instead of null
    });
    await transaction.save();

    // -------------------------------
    // Update User Wallet
    // -------------------------------
    user.walletBalance += Number(amount);
    await user.save();

    res.json({
      success: true,
      message: "Deposit recorded successfully",
      walletBalance: user.walletBalance,
      deposit,
    });

  } catch (err) {
    console.error("Web3 Deposit Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// ---------------------------
// Auto-reconcile blockchain deposits
// ---------------------------
const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
const USDT_ADDRESS = "0x1111111111111111111111111111111111111111";
const USDT_ABI = ["event Transfer(address indexed from, address indexed to, uint amount)"];
const tokenContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

tokenContract.on("Transfer", async (from, to, amount, event) => {
  try {
    if (to.toLowerCase() === process.env.PLATFORM_WALLET.toLowerCase()) {
      const txnHash = event.transactionHash;

      const existsTransaction = await Transaction.findOne({ txnHash });
      const existsDeposit = await Deposit.findOne({ txnHash });
      if (existsTransaction || existsDeposit) return;

      const formattedAmount = Number(ethers.utils.formatUnits(amount, 18));

      // Save Deposit
      await Deposit.create({
        userId: null, // link to user later if possible
        amount: formattedAmount,
        txnHash,
        method: "Auto Web3",
        status: "pending",
      });

      // Save Transaction
      await Transaction.create({
        userId: null,
        type: "deposit",
        amount: formattedAmount,
        grossAmount: formattedAmount,
        netAmount: formattedAmount,
        txnHash,
        description: "Auto-reconciled deposit",
        date: new Date(),
      });

      console.log("Auto-reconciled txn:", txnHash);
    }
  } catch (err) {
    console.error("Auto-reconcile error:", err);
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



// ===============================
// 🔷 BINARY MATCHING (SYSTEM MODE)
// NO carry forward
// ===============================
// ===============================
// 🔷 BINARY MATCHING (WITH CARRY FORWARD)
// ===============================
// ===============================
// 🔷 BINARY MATCHING HELPER
// ✅ Only eligible users (withdrawn >= $100) get binary
// ===============================

// 🔹 Strong / Weak helpers
function addStrong(user, amount) {
  user.strongLegBusiness = (user.strongLegBusiness || 0) + amount;
}

function addWeak(user, amount) {
  user.weakLegBusiness = (user.weakLegBusiness || 0) + amount;
}

// 🔹 Decide which leg to add
function addBusinessOrLeg(sponsor, amount, fromUserId) {
  if (!sponsor.primaryStrongDirect) {
    sponsor.primaryStrongDirect = fromUserId;
  }

  if (sponsor.primaryStrongDirect === fromUserId) {
    addStrong(sponsor, amount);
  } else {
    addWeak(sponsor, amount);
  }
}

// 🔹 Calculate total withdrawn from DB
async function getTotalWithdrawn(userId) {
  const result = await Withdrawal.aggregate([
    { $match: { userId, status: { $in: ["completed", "processed"] } } },
    { $group: { _id: null, total: { $sum: "$grossAmount" } } }
  ]);
  return result[0]?.total || 0;
}

// 🔹 Run binary matching for eligible users only
async function runBinaryMatchingForUser(user) {
  const MIN_MATCH = 100;
  const PERCENT = 0.05;

  // ✅ optional: allow binary income regardless of first withdrawal
  // const totalWithdrawn = await getTotalWithdrawn(user.userId);
  // if (totalWithdrawn < 100) return;

  let strong = user.strongLegBusiness || 0;
  let weak = user.weakLegBusiness || 0;

  if (strong < MIN_MATCH || weak < MIN_MATCH) return;

  const match = Math.min(strong, weak);
  const income = +(match * PERCENT).toFixed(2);

  user.binaryIncome = (user.binaryIncome || 0) + income;
  user.strongLegBusiness = strong - match;
  user.weakLegBusiness = weak - match;

  await user.save();

  await Transaction.create({
    userId: user.userId,
    type: "binary_income",
    amount: income,
    source: "binary",
    status: "pending", // 🔹 pending until first $100 withdrawal if you want
    description: "Binary income matched",
    date: new Date()
  });

  console.log(`Binary income $${income} matched for ${user.userId}`);
}




// 🔹 Propagate binary business up the sponsorship chain
async function propagateBinaryBusiness(startUserId, amount, maxLevels = 10) {
  let current = await User.findOne({ userId: startUserId });

  for (let level = 0; level < maxLevels; level++) {
    if (!current || !current.sponsorId) break;

    const sponsor = await User.findOne({ userId: current.sponsorId });
    if (!sponsor) break;

    // ✅ Add business to correct leg
    if (!sponsor.primaryStrongDirect) {
      sponsor.primaryStrongDirect = current.userId;
    }

    if (sponsor.primaryStrongDirect === current.userId) {
      sponsor.strongLegBusiness = (sponsor.strongLegBusiness || 0) + amount;
    } else {
      sponsor.weakLegBusiness = (sponsor.weakLegBusiness || 0) + amount;
    }

    // 🔒 Run binary income for eligible sponsor
    await runBinaryMatchingForUser(sponsor);

    // ✅ Save sponsor after update
    await sponsor.save();

    // Move to next level
    current = sponsor;
  }
}






router.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, transactionPassword } = req.body;

    const settings = await getSettings();
    if (!settings?.allowWalletTransfer) {
      return res.status(403).json({ message: 'Transfers are currently disabled in the system' });
    }

    // Fetch sender and receiver
    const [sender, receiver] = await Promise.all([
      User.findOne({ userId: Number(fromUserId) }),
      User.findOne({ userId: Number(toUserId) }),
    ]);

    if (!sender) return res.status(404).json({ message: 'Sender not found' });
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    // Validate transaction password
    const isPasswordValid = await bcrypt.compare(transactionPassword, sender.transactionPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid transaction password' });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Invalid transfer amount' });
    }

    if (sender.walletBalance < amt) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Transfer funds
    sender.walletBalance -= amt;
    receiver.walletBalance += amt;

    await sender.save();
    await receiver.save();

    // Log transaction (fixed: added 'amount' field)
    await Transaction.create({
      userId: sender.userId,
      type: 'transfer',
      fromUserId: sender.userId,
      toUserId: receiver.userId,
      amount: amt,         // required by schema
      grossAmount: amt,    // optional, if you want to keep
      description: `Transfer from ${sender.userId} to ${receiver.userId}`,
    });

    res.json({ message: 'Transfer successful' });

  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ message: 'Transfer failed' });
  }
});





 










 
// ==========================
// ---------------------------
// GET withdrawable summary
// ---------------------------
// GET /api/wallet/withdrawable/:userId
 

  
// GET withdrawable balances per plan
 
// GET /api/wallet/withdrawable/:userId
router.get("/withdrawable/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const planBalances = {};

    ["plan1","plan2","plan3","plan4","plan5","plan6","plan7"].forEach(plan => {
      const roiEntry = (user.dailyROI || []).find(d => d.plan === plan);
      if (!roiEntry) {
        planBalances[plan] = 0;
        return;
      }

      const earned    = roiEntry.claimedDays * roiEntry.amount;
      const withdrawn = user.pendingWithdrawals?.[plan] || 0;
      planBalances[plan] = Math.max(earned - withdrawn, 0);
    });

    

    // 🔥 IMPORTANT: yahi shape frontend expect kar raha hai
    res.json({
      walletBalance: user.walletBalance || 0,
      directIncome:  user.directIncome  || 0,
      levelIncome:   user.levelIncome   || 0,
      spinIncome:    user.spinIncome    || 0,
        binaryIncome: user.binaryIncome || 0, // ✅ ADD THIS
      planIncomes:   planBalances,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});











// ---------------------------
// POST withdraw from specific plan
// Atomic and race-condition safe
// ---------------------------
// Helper: calculate available plan balance from dailyROI
 

// Withdraw route
// POST /api/wallet/withdraw
router.post(
  "/withdraw",
  authMiddleware,                    // ✅ ensure user is authenticated
  checkFeature("allowWithdrawals"),  // ✅ feature toggle
  async (req, res) => {
      try {
const { amount, source, transactionPassword, package: packageAmount } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0)
      return res.status(400).json({ message: "Invalid withdrawal amount" });

    const validPlans = ["plan1","plan2","plan3","plan4","plan5","plan6","plan7"];
    if (!validPlans.includes(source))
      return res.status(400).json({ message: "Invalid plan selected." });




const authUserId = req.user.userId;   // 🔐 token se
const user = await User.findOne({ userId: authUserId });

if (!user) {
  return res.status(404).json({ message: "User not found" });
}
 
// 🔐 Transaction password check for ALL users
if (!transactionPassword)
  return res.status(400).json({ message: "Transaction password is required" });

const isPasswordValid = await bcrypt.compare(transactionPassword, user.transactionPassword);
if (!isPasswordValid)
  return res.status(403).json({ message: "Invalid transaction password" });



  

    // ===============================
    // 🔐 USER + PASSWORD CHECK
    // ===============================
 // Check if user exists
// Fetch user


// 🔴 Now handle promo user AFTER password validation
if (user.role === "promo") {
  await Transaction.create({
    userId: user.userId,
    type: "withdrawal",
    source: "plan",
    plan: source,
    amount: amt,
    grossAmount: amt,
    netAmount: amt,
    fee: 0,
    status: "completed",
    description: "PROMO WITHDRAW (DISPLAY ONLY)",
    adminNote: "PROMO",
    date: new Date(),
  });

  return res.json({
    success: true,
    message: "PROMO WITHDRAW RECORDED (DISPLAY ONLY)",
  });
}





    // ===============================
    // 🔥 RUN BINARY MATCHING (AUTO)
    // ===============================

    // ===============================
    // 🔐 FIRST $100 WITHDRAW FLAG
    // ===============================
// After withdrawal record is created
const withdrawalAmount = amt; // already defined

user.totalWithdrawn = (user.totalWithdrawn || 0) + withdrawalAmount;

if(user.totalWithdrawn >= 100){
  user.hasWithdrawn100 = true;
}

await user.save();



    // ===============================
    // 🔹 PLAN EARNING CHECK
    // ===============================
    user.pendingWithdrawals = user.pendingWithdrawals || {};
    const roiEntry = user.dailyROI.find(d => d.plan === source);
    if (!roiEntry)
      return res.status(400).json({ message: "No earnings available in this plan" });

    const earned = roiEntry.claimedDays * roiEntry.amount;
    const withdrawn = user.pendingWithdrawals[source] || 0;
    const withdrawable = Math.max(earned - withdrawn, 0);

    if (amt > withdrawable)
      return res.status(400).json({
        message: `Insufficient withdrawable balance. Max: $${withdrawable}`
      });

    // ===============================
    // 🔹 WALLET 50% CHECK
    // ===============================
    const walletTotal = parseFloat((amt * 0.5).toFixed(2));
    if (user.walletBalance < walletTotal)
      return res.status(400).json({
        message: `Wallet must cover 50% ($${walletTotal})`
      });

    user.walletBalance -= walletTotal;
    user.pendingWithdrawals[source] =
      (user.pendingWithdrawals[source] || 0) + amt;
    await user.save();

        await propagateBinaryBusiness(user.userId, amt);


    // ===============================
    // 🔹 FEES & PAYOUT
    // ===============================
    const planPercentages = {
      plan1: 5.5, plan2: 5.75, plan3: 6,
      plan4: 6.5, plan5: 6.75, plan6: 7, plan7: 7.5
    };

    const payoutPercent = planPercentages[source] || 5;
    const feePercent = 0.10;
    const intervalDays = 5;

    const totalFee = parseFloat((amt * feePercent).toFixed(2));
    const totalNet = parseFloat((amt - totalFee).toFixed(2));

    // ===============================
    // 🔷 ADD BINARY WITH PLAN
    // ===============================
    let finalNetAmount = totalNet;

    if (user.hasWithdrawn100 && user.binaryIncome > 0) {
      finalNetAmount += user.binaryIncome;

      await Transaction.create({
        userId: user.userId,
        type: "binary_income",
        amount: user.binaryIncome,
        grossAmount: user.binaryIncome,
        netAmount: user.binaryIncome,
        description: "Binary income released with plan withdrawal",
        status: "completed",
      });

      user.binaryIncome = 0;
      await user.save();
    }

    // ===============================
    // 🔹 PAYOUT SCHEDULE
    // ===============================
    const schedule = [];
    const totalPayouts = Math.ceil(100 / payoutPercent);
    const firstPayoutDate = new Date();
    firstPayoutDate.setDate(firstPayoutDate.getDate() + 1);

    let paidGross = 0;
    let paidFee = 0;
    let paidWallet = 0;

    for (let i = 0; i < totalPayouts; i++) {
      let remainingGross = amt - paidGross;
      let gross = Math.min(
        parseFloat((amt * payoutPercent / 100).toFixed(2)),
        remainingGross
      );

      let fee = parseFloat((gross * feePercent).toFixed(2));
      if (i === totalPayouts - 1) fee = totalFee - paidFee;

      let net = gross - fee;
      let walletUsed = Math.min(
        parseFloat((walletTotal * payoutPercent / 100).toFixed(2)),
        walletTotal - paidWallet
      );

      schedule.push({
        day: `Payout ${i + 1}`,
        date: new Date(firstPayoutDate.getTime() + i * intervalDays * 86400000)
          .toISOString().split("T")[0],
        percent: payoutPercent,
        grossAmount: gross,
        fee,
        netAmount: net,
        walletUsed,
        incomeUsed: net - walletUsed,
        status: "pending",
        walletAddress: user.walletAddress,
      });

      paidGross += gross;
      paidFee += fee;
      paidWallet += walletUsed;
      if (paidGross >= amt) break;
    }

    // ===============================
    // 🔹 SAVE WITHDRAW + TXN
    // ===============================
    const withdrawal = await Withdrawal.create({
  userId: user.userId,
      source,
      package: packageAmount,
      grossAmount: amt,
      walletUsed: paidWallet,
      incomeUsed: finalNetAmount - paidWallet,
      fee: totalFee,
      netAmount: finalNetAmount,
      walletAddress: user.walletAddress,
      status: "pending",
      schedule,
    });

    const txn = await Transaction.create({
  userId: authUserId, // ✅ token userId
      type: "withdrawal",
      source: "plan",
      plan: source,
      package: packageAmount,
      amount: amt,
      grossAmount: amt,
      fee: totalFee,
      netAmount: finalNetAmount,
      description: `Withdrawal from ${source}`,
      status: "pending",
    });

    res.json({
      success: true,
      message: `Withdrawal request submitted successfully`,
      transaction: txn,
      withdrawal,
      withdrawableRemaining: withdrawable - amt,
      schedule,
    });

  } catch (err) {
    console.error("Withdraw error:", err);
    res.status(500).json({ message: "Server error" });
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
router.post(
  "/credit-to-wallet",
  authMiddleware,                       // 🔐 login required
  checkFeature("allowCreditToWallet"),  // 🔥 SETTINGS CHECK
  async (req, res) => {
  try {
    let { userId, amount, source, transactionPassword } = req.body;
    amount = parseFloat(amount);

    // Validate source
    if (!["direct", "level", "spin", "binary"].includes(source)) {
      return res.status(400).json({ message: "Only direct, level, spin, or binary incomes can be credited" });
    }

    // Fetch user
    const user = await User.findOne({ userId: Number(userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify transaction password
    const isPasswordValid = await bcrypt.compare(transactionPassword, user.transactionPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid transaction password" });
    }

    // Fetch admin settings
    const settings = await Setting.findOne({});
    if (!settings) return res.status(500).json({ message: "System settings not found" });

    // Check if crediting is allowed
    if (!settings.allowTopUps) {
      return res.status(403).json({ message: "Credit to wallet is disabled by admin" });
    }

    // Check available income
    const available = await getAvailableIncomesFixed(userId); // returns {direct, level, spin, binary}
    if (amount > (available[source] || 0)) {
      return res.status(400).json({ message: `Insufficient ${source} income. Available: $${available[source] || 0}` });
    }

    // Update wallet and income atomically
    const updateResult = await User.updateOne(
      { userId: Number(userId), [`${source}Income`]: { $gte: amount } },
      { $inc: { walletBalance: amount, [`${source}Income`]: -amount } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ message: "Failed to credit wallet due to insufficient balance" });
    }

    // Fetch updated user
    const updatedUser = await User.findOne({ userId: Number(userId) });

    // Record transaction
    const txn = await Transaction.create({
      userId: updatedUser.userId,
      type: "credit_to_wallet",
      source,
      amount,
      grossAmount: amount,
      netAmount: amount,
      fee: 0,
      description: `Credited $${amount} from ${source} income to wallet`,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: `Successfully credited $${amount} from ${source} to wallet`,
      transaction: txn,
      walletBalance: updatedUser.walletBalance,
    });

  } catch (err) {
    console.error("Credit-to-wallet error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// ---------------------------
// INSTANT WITHDRAW ROUTE
// For direct, level, spin only with fee
// Atomic and race-condition safe
// ---------------------------
router.post("/instant-withdraw", async (req, res) => {
  try {
    let { userId, amount, source, transactionPassword, walletAddress } = req.body;
   // console.log("🔥 ROUTE HIT:", req.body);

    userId = Number(userId);
    amount = parseFloat(amount);

    // ===============================
    // 🔐 BASIC VALIDATION
    // ===============================
    if (isNaN(userId) || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId or amount",
      });
    }

    if (!["direct", "level", "spin", "binary"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid income source",
      });
    }

    // ===============================
    // 🔐 FETCH USER
    // ===============================
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===============================
    // 🔐 TRANSACTION PASSWORD CHECK
    // ===============================
    const isPasswordValid = await bcrypt.compare(
      transactionPassword,
      user.transactionPassword
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction password",
      });
    }

    // ===============================
    // 💰 INCOME FIELD DECISION
    // ===============================
    const incomeField =
      source === "binary" ? "binaryIncome" : `${source}Income`;

    if ((user[incomeField] || 0) < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${source} income`,
      });
    }

    // ===============================
    // 💸 FEE CALCULATION
    // ===============================
    const feePercent = 0.10;
    const fee = parseFloat((amount * feePercent).toFixed(2));
    const netAmount = parseFloat((amount - fee).toFixed(2));
    const walletAddr = walletAddress || user.walletAddress || "N/A";

    // ===============================
    // 🔥 ATOMIC DEDUCTION
    // ===============================
    await User.updateOne(
      { userId, [incomeField]: { $gte: amount } },
      { $inc: { [incomeField]: -amount } }
    );

    // ===============================
    // 🧾 TRANSACTION LOG
    // ===============================
    const txn = await Transaction.create({
      userId,
      type: "withdrawal",
      source,
      amount,
      grossAmount: amount,
      fee,
      netAmount,
      walletAddress: walletAddr,
      description: `Instant withdrawal from ${source} income`,
      status: "pending",
      createdAt: new Date(),
    });

    // ===============================
    // 📄 WITHDRAWAL RECORD
    // ===============================
    const withdrawal = await Withdrawal.create({
      userId,
      source,
      type: source,
      grossAmount: amount,
      fee,
      netAmount,
      walletUsed: 0,
      incomeUsed: amount,
      walletAddress: walletAddr,
      status: "pending",
      schedule: [],
      createdAt: new Date(),
    });

    // ===============================
    // 📊 RESPONSE
    // ===============================
    const updatedUser = await User.findOne({ userId });

    res.json({
      success: true,
      message: "Instant withdrawal submitted successfully",
      transaction: txn,
      withdrawal,
      netAmount,
      availableIncomes: {
        directIncome: updatedUser.directIncome || 0,
        levelIncome: updatedUser.levelIncome || 0,
        spinIncome: updatedUser.spinIncome || 0,
        binaryIncome: updatedUser.binaryIncome || 0,
      },
    });

  } catch (err) {
    console.error("Instant withdraw error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
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
// ✅ GET /api/wallet/withdrawals/:userId
router.get("/withdrawals/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const withdrawals = await Withdrawal.find({ userId }).sort({ createdAt: -1 });

    const result = withdrawals.map((w) => {
  const wObj = w.toObject();

  // Calculate fee and net if missing (fallback for older records)
  const fee = wObj.fee ?? 0;
  const netAmount = wObj.netAmount ?? (wObj.grossAmount - fee);

  return {
    ...wObj,

    // 🔥 ENSURE package is always sent (NEW + OLD withdrawals)
    package: wObj.package ?? (
      wObj.plan === "plan1" ? 10 :
      wObj.plan === "plan2" ? 25 :
      wObj.plan === "plan3" ? 50 :
      wObj.plan === "plan4" ? 100 :
      wObj.plan === "plan5" ? 200 :
      wObj.plan === "plan6" ? 500 :
      wObj.plan === "plan7" ? 1000 : null
    ),

    plan: wObj.plan ?? null,

walletAddress: wObj.walletAddress || "N/A",
    fee,
    netAmount,
  };
});


    res.json({ success: true, withdrawals: result });
  } catch (err) {
    console.error("Withdrawal history error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching withdrawals" });
  }
});



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




module.exports = router;
