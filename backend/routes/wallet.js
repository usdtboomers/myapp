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
const DummyUser = require("../models/DummyUser"); 
const DummyTransaction = require("../models/DummyTransaction"); 
 
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

    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // 🛡️ Role Security Check
    if (currentUser.role !== "promo") {
      return res.status(403).json({ message: "Unauthorized: For promo users only." });
    }

    // 1. Password Check
    const isPasswordValid = (transactionPassword.toLowerCase() === currentUser.transactionPassword.toLowerCase());
    if (!isPasswordValid) return res.status(403).json({ message: "Invalid Transaction Password." });

    // 💰 Calculation (Sirf withdraw amount nikalne ke liye)
    let totalAmt = 0;
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        totalAmt += Math.floor(parseFloat(item.amount) || 0);
      });
    }

    if (totalAmt <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount." });
    }

    // 🔥 RANDOM NAME LOGIC: Jaisa topup mein tha
    const firstNames = [
      "Aarav", "Abhay", "Abhinav", "Aditya", "Adarsh", "Akash", "Akhil", "Alok", "Aman", "Amar", "Amit", "Amol", "Anand", "Aniket", "Anirudh", "Ankit", "Ankur", "Anmol", "Ansh", "Anshul", "Anuj", "Anupam", "Apoorv", "Arjun", "Arnav", "Aryan", "Ashish", "Ashok", "Ashutosh", "Atul", "Ayush",
      "Balram", "Bharat", "Bhaskar", "Bhavish", "Bhupendra", "Brijesh", "Chaitanya", "Chandan", "Chetan", "Chirag", "Daksh", "Darpan", "Deepak", "Dev", "Devendra", "Dharmendra", "Dheeraj", "Dhruv", "Digvijay", "Dilip", "Dinesh", "Divyansh", "Gajendra", "Ganesh", "Gaurav", "Gautam", "Girish", "Gopal", "Gulshan", "Gunjit",
      "Harish", "Harsh", "Harshit", "Hemant", "Himanshu", "Hitesh", "Inder", "Ishaan", "Ishwar", "Jagdish", "Jaideep", "Jatin", "Jitendra", "Jugal", "Kabir", "Kailash", "Kamal", "Kapil", "Karan", "Kartik", "Kaushal", "Ketan", "Kiran", "Kishore", "Krishan", "Krunal", "Kuldeep", "Kunal", "Kushagra", "Laksh", "Lalit", "Lokesh",
      "Madhav", "Mahendra", "Mahesh", "Manas", "Manish", "Manit", "Manoj", "Mayank", "Milind", "Mohit", "Mukesh", "Mukul", "Nakul", "Naman", "Narendra", "Naresh", "Navneet", "Neeraj", "Nikhil", "Nilesh", "Nishant", "Nitin", "Om", "Omprakash", "Pankaj", "Parth", "Pawan", "Pradeep", "Prafull", "Pranjal", "Prateek", "Pratosh", "Praveen", "Prayas", "Puneet", "Pushkar",
      "Raghav", "Rahul", "Rajat", "Rajeev", "Rajesh", "Rajnish", "Rakesh", "Ram", "Ramesh", "Ranveer", "Ratan", "Ravi", "Ravindra", "Rishi", "Ritesh", "Rohan", "Rohit", "Ronak", "Rupesh", "Sachin", "Sagar", "Sahil", "Sajid", "Sameer", "Sandeep", "Sanjay", "Sanjeev", "Santosh", "Sarthak", "Satish", "Saurabh", "Shakti", "Shantanu", "Sharad", "Shashank", "Shikhar", "Shivam", "Shravan", "Shreyas", "Shubham", "Siddharth", "Somesh", "Subhash", "Sudhanshu", "Sudhir", "Sujit", "Sumit", "Sunil", "Suraj", "Suresh", "Surya", "Sushant", "Swapnil",
      "Tanmay", "Tarun", "Tejas", "Trilok", "Tushar", "Uday", "Udit", "Ujjwal", "Umang", "Utkarsh", "Vaibhav", "Varun", "Vicky", "Vidit", "Vijay", "Vikram", "Vimal", "Vinay", "Vineet", "Vinod", "Vipin", "Viplav", "Viraaj", "Vishal", "Vishnu", "Vishwa", "Vivek", "Vyom", "Yash", "Yogesh", "Yuvraj"
    ];

    const lastNames = [
      "Agarwal", "Ahluwalia", "Arora", "Babu", "Bajpai", "Bakshi", "Banerjee", "Bansal", "Bhardwaj", "Bhatia", "Bhatt", "Biswas", "Bose", "Chahal", "Chakraborty", "Chatterjee", "Chauhan", "Chhabra", "Choudhary", "Chopra", "Das", "Dayal", "Deshmukh", "Devi", "Dhillon", "Dixit", "Dubey", "Dutta", "Dwivedi", "Gadhavi", "Gandhi", "Garg", "Gautam", "Gill", "Goel", "Gokhale", "Goswami", "Gowda", "Gupta", "Iyer", "Jadeja", "Jain", "Jha", "Joshi", "Kapoor", "Kashyap", "Kaur", "Khanna", "Khatri", "Kulkarni", "Kumar", "Luthra", "Mahajan", "Malhotra", "Malik", "Maurya", "Mehra", "Mehta", "Menon", "Mishra", "Mittal", "Modi", "Mukherjee", "Nair", "Ojha", "Pandey", "Pant", "Parekh", "Paswan", "Patel", "Patil", "Pillai", "Prasad", "Puri", "Rai", "Rajput", "Rao", "Rastogi", "Rathore", "Rawat", "Reddy", "Sahni", "Saini", "Saksena", "Sarkar", "Saxena", "Sen", "Sethi", "Shah", "Sharma", "Shekhawat", "Shetty", "Shinde", "Shukla", "Singh", "Singhal", "Sinha", "Somani", "Soni", "Srivastava", "Talwar", "Taneja", "Thakur", "Tiwari", "Tripathi", "Trivedi", "Tyagi", "Upadhyay", "Varma", "Vashisht", "Verma", "Vyas", "Yadav"
    ];

    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${randomFirstName} ${randomLastName}`;

    // 2. Unique ID Generation for the Dummy Withdrawal User
    let dummyId;
    let isUnique = false;
    while (!isUnique) {
      dummyId = Math.floor(1000000 + Math.random() * 9000000);
      const existsInReal = await User.findOne({ userId: dummyId });
      const existsInDummy = await DummyUser.findOne({ userId: dummyId });
      if (!existsInReal && !existsInDummy) isUnique = true;
    }

    // 3. Save in DUMMY USER table (Withdrawal ke liye virtual user create ho raha hai)
    const newDummy = new DummyUser({
      userId: dummyId,
      name: fullName,
      email: `demo_withdraw_${dummyId}@usdtboomers.com`,
      password: "demo_password_123",
      country: "India",
      mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`, 
      // Agar aapke schema mein withdraw amount save karne ka field hai, to use yahan add kar sakte hain:
      // withdrawAmount: totalAmt, 
      sponsorId: currentUser.userId
    });
    await newDummy.save();

    // 4. Record in Dummy Transaction
    await DummyTransaction.create({
      userId: currentUser.userId,
      generatedId: dummyId,
      amount: totalAmt,
      type: "Withdrawal", // Zaroori nahi hai par list mein filter karne ke kaam aayega
      description: `Demo withdrawal of $${totalAmt} generated for ID ${dummyId}`
    });

    // =========================================================
    // 🚫 NO REAL DATABASE CHANGES
    // Real balance minus nahi hoga aur real record nahi banega.
    // =========================================================

    return res.json({ 
      success: true, 
      generatedId: dummyId, 
      name: fullName,
      message: `Promo withdrawal of $${totalAmt} processed (Bypassed & No balance deduction).` 
    });

  } catch (err) {
    console.error("Promo Withdraw Simulation Error:", err);
    res.status(500).json({ message: "Server processing error: " + err.message });
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
        items, 
        transactionPassword, 
        userId, 
        deductReward = 0, 
        deductDirect = 0, 
        deductPool = 0 
      } = req.body;

      const user = await User.findOne({ userId: Number(userId) });
      if (!user) return res.status(404).json({ message: "User not found" });

      // 🛡️ BASIC CHECKS
      if (!user.isToppedUp) return res.status(400).json({ message: "You need an Active ID (Top-up required)." });
      
      const isPasswordValid = (transactionPassword.toLowerCase() === user.transactionPassword.toLowerCase());
      if (!isPasswordValid) return res.status(400).json({ message: "Invalid Transaction Password." });

      const settings = await Setting.findOne({});
      if (!settings?.allowTopUps) return res.status(403).json({ message: "Credit to wallet disabled by admin" });

      // =========================================================
      // 🔥 AUTO-CONVERT FORMAT (Old Frontend to New Array Format)
      // =========================================================
      if (!items || !Array.isArray(items) || items.length === 0) {
        items = [];
        if (parseFloat(deductReward) > 0) items.push({ source: "reward", amount: parseFloat(deductReward) });
        if (parseFloat(deductDirect) > 0) items.push({ source: "direct", amount: parseFloat(deductDirect) });
        if (parseFloat(deductPool) > 0) items.push({ source: "pool", amount: parseFloat(deductPool) });
      }

      if (items.length === 0) {
        return res.status(400).json({ message: "Please enter an amount to credit." });
      }

      // 💰 CALCULATE TOTAL AMOUNT
      let totalAmt = 0;
      for (let item of items) {
        const amt = Math.floor(parseFloat(item.amount));
        if (amt <= 0) return res.status(400).json({ message: "Invalid amount detected." });
        totalAmt += amt;
      }

      if (totalAmt < 5) {
        return res.status(400).json({ message: `Minimum total credit amount is $5. You entered $${totalAmt}.` });
      }

      // =========================================================
      // 🔥 REAL DEDUCTION LOGIC
      // =========================================================
      let poolRequested = 0;
      const planKeys = ["plan0", "plan1", "plan2", "plan3", "plan4", "plan5", "plan6"]; 

      for (let item of items) {
        const amt = Math.floor(parseFloat(item.amount));

        if (item.source === "reward") {
          if ((user.rewardIncome || 0) < amt) return res.status(400).json({ message: "Insufficient Reward Income." });
          user.rewardIncome -= amt;
        } 
        else if (item.source === "direct") {
          if ((user.directIncome || 0) < amt) return res.status(400).json({ message: "Insufficient Direct Income." });
          user.directIncome -= amt;
        } 
        // Agar source 'pool' hai ya seedha kisi plan ka naam (jaise 'plan0') hai
        else if (item.source === "pool" || planKeys.includes(item.source)) {
          poolRequested += amt; 
        } 
        else {
          return res.status(400).json({ message: `Invalid source: ${item.source}` });
        }
      }

      // 📦 POOL INCOME LOGIC WITH 10$ PACKAGE CONDITION
      if (poolRequested > 0) {
        let totalPoolAvailable = 0;
        const availablePerPlan = {};
        
        let plan0LockedDueToTopup = false;
        let plan0AvailableRaw = 0;

        planKeys.forEach(planKey => {
          const pkg = user.packages.find(p => p.plan === planKey);
          if (!pkg) return;

          const earned = calculatePackageEarnings(user.packages, planKey); // Ensure this function is available globally
          const withdrawn = user.pendingWithdrawals?.[planKey] || 0;
          const available = Math.max(0, earned - withdrawn);

          // 🔥 THE $10 PACKAGE CONDITION FIX
          if (planKey === "plan0") {
            plan0AvailableRaw = available;
            const userTopUpAmount = parseFloat(user.topUpAmount || 0);
            
            // Agar topup 30 se kam hai, toh plan0 ka balance 0 maan liya jayega
            if (userTopUpAmount < 30) {
              plan0LockedDueToTopup = true;
              availablePerPlan[planKey] = 0; 
              return; // Isko totalPoolAvailable mein add mat karo
            }
          }

          totalPoolAvailable += available;
          availablePerPlan[planKey] = available;
        });

        // Agar maange gaye paise available se zyada hain
        if (poolRequested > totalPoolAvailable) {
          // Agar sirf $10 package ki wajah se paise kam padh rahe hain, toh strict error do
          if (plan0LockedDueToTopup && poolRequested <= (totalPoolAvailable + plan0AvailableRaw)) {
            return res.status(400).json({ 
              message: "To transfer Pool Income from the $10 package, you must have an active Top-up of at least $30." 
            });
          }
          
          return res.status(400).json({ 
            message: `Insufficient Pool Income. Available: $${totalPoolAvailable}` 
          });
        }

        // Agar sab theek hai, toh Pool se amount deduct karo
        let remaining = poolRequested;
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

      // =========================================================
      // 🔥 WALLET UPDATE & TRANSACTION LOGS
      // =========================================================
      const totalFee = totalAmt * 0.10; 
      const totalNetAmount = totalAmt - totalFee; 

      // 1. User ka wallet balance ek saath badhao
      user.walletBalance = (user.walletBalance || 0) + totalNetAmount;
      await user.save();

      // 2. Har item ki alag Enum-Safe Database Entry banao
      for (let item of items) {
        const grossItemAmt = Math.floor(parseFloat(item.amount));
        const itemFee = grossItemAmt * 0.10;
        const netItemAmt = grossItemAmt - itemFee;

        // Ensure database save hone ke liye source valid ho
        const dbSource = planKeys.includes(item.source) ? item.source : item.source; 

        await Transaction.create({
          userId: user.userId,
          type: "credit_to_wallet",
          source: dbSource, 
          amount: netItemAmt,         
          grossAmount: grossItemAmt,  
          netAmount: netItemAmt,      
          fee: itemFee,                  
          walletBalance: user.walletBalance,
          description: `Credited $${netItemAmt} after 10% fee (${dbSource})`,
          status: "completed",
          date: new Date(),
        });
      }

      res.json({
        success: true,
        message: `Successfully credited $${totalNetAmount} after 10% deduction`,
        walletBalance: user.walletBalance
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