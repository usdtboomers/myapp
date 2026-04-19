const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const verifyAdmin = require('../middleware/adminAuth');
 const LoginHistory = require('../models/LoginHistory');
const IpRule = require('../models/IpRule');

const { ethers } = require('ethers');
require('dotenv').config();

// Load environment variables
 const BSC_NODE_URL = process.env.BSC_NODE_URL;
const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;

  
const tokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
];

  

 
// Admin impersonate user
// 🔹 IMPERSONATE USER (Login as User from Admin Panel)
router.post('/impersonate', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body; // Frontend se userId body me aayega

    // 1. Find the target user
    const user = await User.findOne({ userId: Number(userId) }).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔥 NOTE: Hum yahan "user.isBlocked" check NAHI kar rahe hain.
    // Iska matlab Admin ek blocked user ke account me bhi easily login kar sakta hai.

    // 2. Generate Token (Same format as normal login)
    const userToken = jwt.sign(
      { id: user._id }, // Normal login me _id use hoti hai token me
      process.env.JWT_SECRET || 'yoursecretkey',
      { expiresIn: '1d' } // Admin login 1 din tak chalega
    );

    // 3. Sensitive data hide karein frontend pe bhejte time
    delete user.password;
    delete user.transactionPassword;

    // 4. Send token and user data back to frontend
    res.json({ 
      message: "Impersonation successful",
      token: userToken, 
      user 
    });

  } catch (err) {
    console.error("Impersonation Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard summary
// Dashboard summary (UPDATED FOR ALL CARDS)
// Dashboard summary (UPDATED FOR ALL CARDS - WITH FIX FOR STRINGS & GROSSAMOUNT)
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      todayUsers,
      paidUsers,
      depositStats,
      withdrawalStats
    ] = await Promise.all([
      // 1. Total Users
      User.countDocuments(),
      
      // 2. Today's New Users
      User.countDocuments({ createdAt: { $gte: today } }),
      
      // 3. Total Paid Users
      User.countDocuments({ topUpAmount: { $gt: 0 } }),
      
      // 4. DEPOSIT STATS (String to Double conversion added)
      Deposit.aggregate([
        {
          $facet: {
            total: [{ $group: { _id: null, sum: { $sum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } } } }],
            today: [
              { $match: { createdAt: { $gte: today } } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } } } }
            ],
            pendingToday: [
              { $match: { createdAt: { $gte: today }, status: "pending" } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } } } }
            ]
          }
        }
      ]),

      // 5. WITHDRAWAL STATS (Using grossAmount and String to Double conversion)
      Withdrawal.aggregate([
        {
          $facet: {
            totalAll: [{ $group: { _id: null, sum: { $sum: { $convert: { input: { $ifNull: ["$grossAmount", "$amount"] }, to: "double", onError: 0, onNull: 0 } } } } }],
            approvedTotal: [
              { $match: { status: "approved" } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: { $ifNull: ["$grossAmount", "$amount"] }, to: "double", onError: 0, onNull: 0 } } } } }
            ],
            approvedToday: [
              { $match: { createdAt: { $gte: today }, status: "approved" } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: { $ifNull: ["$grossAmount", "$amount"] }, to: "double", onError: 0, onNull: 0 } } } } }
            ],
            pendingTotal: [
              { $match: { status: "pending" } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: { $ifNull: ["$grossAmount", "$amount"] }, to: "double", onError: 0, onNull: 0 } } } } }
            ],
            pendingToday: [
              { $match: { createdAt: { $gte: today }, status: "pending" } },
              { $group: { _id: null, sum: { $sum: { $convert: { input: { $ifNull: ["$grossAmount", "$amount"] }, to: "double", onError: 0, onNull: 0 } } } } }
            ]
          }
        }
      ])
    ]);

    const dep = depositStats[0];
    const withD = withdrawalStats[0];

    res.json({
      totalUsers,
      todayUsers,
      paidUsers,
      
      totalDeposit: dep.total[0]?.sum || 0,
      todayDeposit: dep.today[0]?.sum || 0,
      pendingDepositToday: dep.pendingToday[0]?.sum || 0,
      
      totalWithdrawal: withD.totalAll[0]?.sum || 0,
      approvedWithdrawalTotal: withD.approvedTotal[0]?.sum || 0,
      approvedWithdrawalToday: withD.approvedToday[0]?.sum || 0,
      pendingWithdrawalTotal: withD.pendingTotal[0]?.sum || 0,
      pendingWithdrawalToday: withD.pendingToday[0]?.sum || 0,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Dashboard data fetch failed' });
  }
});
// GET /api/admin/stats
router.get("/stats", verifyAdmin, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const today = new Date().toISOString().split('T')[0];
  const todayUsers = await User.countDocuments({
    createdAt: { $gte: new Date(today) }
  });
  const totalDeposit = await Deposit.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalWithdrawal = await Withdrawal.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  res.json({
    totalUsers,
    todayUsers,
    totalDeposit: totalDeposit[0]?.total || 0,
    totalWithdrawal: totalWithdrawal[0]?.total || 0
  });
});





// 🔹 GET /login-stats (For Advanced Login Analytics)
// 🔹 GET /login-stats (For Advanced Login Analytics)
router.get("/login-stats", verifyAdmin, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query; // NAYA: Range filters
    
    let matchStage = {};
    
    if (fromDate || toDate) {
      matchStage.loginTime = {};
      
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        matchStage.loginTime.$gte = start;
      }
      
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        matchStage.loginTime.$lte = end;
      }
    } else {
      // Default: Only today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchStage = { loginTime: { $gte: today } };
    }

    const userLogins = await LoginHistory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$userId", 
          name: { $first: "$name" },
          mobile: { $first: "$mobile" }, 
          loginCount: { $sum: 1 }, 
          lastLoginTime: { $max: "$loginTime" }
        }
      },
      {
        $project: {
          userId: "$_id",
          name: 1,
          mobile: 1, 
          loginCount: 1,
          lastLoginTime: 1,
          _id: 0
        }
      },
      { $sort: { loginCount: -1 } } 
    ]);

    const totalLoginAttempts = userLogins.reduce((acc, user) => acc + user.loginCount, 0);
    const uniqueUsers = userLogins.length;

    res.json({
      success: true,
      summary: { totalLoginAttempts, uniqueUsers },
      userLogins
    });

  } catch (error) {
    console.error("Error in /login-stats:", error);
    res.status(500).json({ success: false, message: "Error fetching login stats" });
  }
});

// Admin reverses a transaction
 




// 1. 🔍 USER SEARCH (ID daalo, Details aur IP paao)
router.post('/search-user', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "User not found!" });

        // Is user ke IP par aur kitne log hain?
        const usersOnSameIp = await User.find({ ipAddress: user.ipAddress }).select('userId name email');
        
        res.json({ user, usersOnSameIp });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// 2. 🔍 IP SEARCH (IP daalo, uski limit aur logged users paao)
router.post('/search-ip', async (req, res) => {
    try {
        const { ipAddress } = req.body;
        const users = await User.find({ ipAddress }).select('userId name email isBlocked');
        let rule = await IpRule.findOne({ ipAddress });
        
        if (!rule) rule = { ipAddress, limit: 5, isBlocked: false }; // Default

        res.json({ users, rule });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// 3. ⚙️ UPDATE IP RULE (Limit badhana ya IP Block karna)
router.post('/update-ip-rule', async (req, res) => {
    try {
        const { ipAddress, limit, isBlocked } = req.body;
        let rule = await IpRule.findOne({ ipAddress });

        if (rule) {
            rule.limit = limit;
            rule.isBlocked = isBlocked;
            await rule.save();
        } else {
            await IpRule.create({ ipAddress, limit, isBlocked });
        }
        res.json({ message: "IP Rules Updated Successfully!" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

// 4. 🚫 TOGGLE SPONSOR LINK (Referral Deactivate/Activate)
router.post('/toggle-sponsor', async (req, res) => {
    try {
        const { userId, status } = req.body; // status true = deactivated
        const user = await User.findOneAndUpdate(
            { userId }, 
            { isSponsorDeactivated: status }, 
            { new: true }
        );
        res.json({ message: status ? "Sponsor Link Blocked!" : "Sponsor Link Activated!" });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});


// 📊 5. GET LIVE IP & LOGIN STATS
// 📊 5. GET LIVE IP & LOGIN STATS (Unique Users Only)
router.get('/live-ip-stats', async (req, res) => {
    try {
        const LoginHistory = require('../models/LoginHistory');
        const User = require('../models/User');

        // 🔥 SMART FIX: Ek ID ek hi baar aayegi, aur uska sabse latest time dikhega
        const recentLogins = await LoginHistory.aggregate([
            { $sort: { createdAt: -1 } }, // 1. Sabse naye records upar laao
            { 
                $group: { 
                    _id: "$userId", // 2. User ID ke hisaab se Group banao (Duplicate hatao)
                    name: { $first: "$name" }, // Uska naam lo
                    ipAddress: { $first: "$ipAddress" }, // Latest IP lo
                    createdAt: { $first: "$createdAt" } // Latest Time lo
                } 
            },
            { $sort: { createdAt: -1 } }, // 3. Group banne ke baad fir se Naye Time ke hisaab se arrange karo
            { $limit: 15 } // 4. Sirf top 15 "Unique" log dikhao
        ]);

        // Har login ke IP par total kitne accounts hain, wo count karo
        const enrichedData = await Promise.all(recentLogins.map(async (log) => {
            const count = await User.countDocuments({ ipAddress: log.ipAddress });
            return {
                userId: log._id, // MongoDB grouping mein ID '_id' ban jati hai, humne isey wapas userId kar diya
                name: log.name,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt,
                totalAccountsOnIp: count
            };
        }));

        res.json(enrichedData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------------------------------------------------
// ✅ TELEGRAM MANAGEMENT ROUTES (ADMIN ONLY)
// ------------------------------------------------------------------

// 1. Unlink / Reset User's Telegram Account
router.put('/user/:userId/reset-telegram', verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params; // Database ka _id
        
        const updatedUser = await User.findByIdAndUpdate(userId, {
            $unset: { telegramId: "" }, // Telegram ID delete karega
            isTelegramJoined: false     // Status wapas false karega
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ success: true, message: "Telegram account unlinked successfully." });
    } catch (error) {
        console.error("Admin Reset Telegram Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// 2. Manual Verify User (Bypass Telegram)
router.put('/user/:userId/manual-verify', verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params; // Database ka _id
        
        const updatedUser = await User.findByIdAndUpdate(userId, {
            isTelegramJoined: true,
            telegramId: `ADMIN_VERIFIED_${Date.now()}` // Fake ID taaki system error na de
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ success: true, message: "User manually verified by Admin." });
    } catch (error) {
        console.error("Admin Manual Verify Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/deposits
// Fetch all deposits for admin view
// GET /api/admin/deposits
// Fetch all deposits (System + Manual) for admin view
router.get('/deposits', verifyAdmin, async (req, res) => {
  try {
    // 1. Pehle Deposit collection se system deposits laao
    const systemDeposits = await Deposit.find().sort({ createdAt: -1 }).lean();
    
    // 2. Phir Transaction collection se manual deposits laao (Agar wo Deposit collection me nahi hain)
    const manualTxns = await Transaction.find({ 
      type: 'deposit', 
      source: 'manual' 
    }).sort({ createdAt: -1 }).lean();

    // Dono ko mix kar do (par dhyaan rahe ID duplicate na ho)
    const allDeposits = [...systemDeposits];
    
    manualTxns.forEach(tx => {
       // Agar same txnHash wala record pehle se array me nahi hai toh hi daalo
       const exists = allDeposits.some(d => d.txnHash === tx.txnHash);
       if(!exists){
           allDeposits.push({
               _id: tx._id,
               userId: tx.userId,
               amount: tx.amount,
               txnHash: tx.txnHash || `MANUAL-${tx._id.toString().substring(0,8)}`,
               status: tx.status || 'approved',
               createdAt: tx.createdAt || tx.date
           });
       }
    });

    // 3. Naye mix array ko date ke hisaab se sort karo
    allDeposits.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4. Sabke naam fetch karo
    const userIds = [...new Set(allDeposits.map(dep => dep.userId))];
    const users = await User.find({ userId: { $in: userIds } }, 'userId name').lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u.name]));

    // 5. Response me naam daal kar bhejo
    const enrichedDeposits = allDeposits.map(dep => ({
      ...dep,
      name: userMap[dep.userId] || 'Unknown User'
    }));

    res.json(enrichedDeposits);
  } catch (err) {
    console.error('Failed to fetch all deposits:', err);
    res.status(500).json({ message: 'Failed to fetch all deposits' });
  }
});

// PUT: Reverse any transaction by ID
// routes/admin.js
// routes/admin.js (ya jaha tu admin routes rakhta hai)
 

// -----------------------------
// ✅ Bulk Reverse Transactions
// -----------------------------
const { reverseTransactions } = require("../controllers/admin/reverseTransactions");
router.put("/transactions/reverse", verifyAdmin, reverseTransactions);


 




 




// Get all users
// ✅ Protected Route: Get all users (admin only)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});


// Get all users as global team with count and real userIds
router.get('/global-team', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { userId: 1, _id: 0 }).lean();
    const userIds = users.map(u => u.userId);
    res.json({
      totalGlobalTeam: userIds.length,
      userIds: userIds
    });
  } catch (err) {
    console.error('Error fetching global team:', err);
    res.status(500).json({ message: 'Failed to fetch global team' });
  }
});


// POST /auth/register (Admin adds a new user)

// ✅ Admin adds a new user
router.post('/auth/register', verifyAdmin, async (req, res) => {
  try {
    const { name, email, mobile, country, password, txnPassword, sponsorId } = req.body;

    // 1️⃣ Validate required fields
    if (!name || !email || !mobile || !country || !password || !txnPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 2️⃣ Check if email or mobile already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or mobile already exists' });
    }

    // 3️⃣ Hash passwords
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedTxnPassword = await bcrypt.hash(txnPassword, 10);

    // 4️⃣ Generate unique userId
    const lastUser = await User.findOne().sort({ createdAt: -1 });
    const userId = lastUser ? lastUser.userId + 1 : 1000;

    // 5️⃣ Create new user document (match schema field name)
    const newUser = new User({
      userId,
      name,
      email,
      mobile,
      country,
      password: hashedPassword,
      transactionPassword: hashedTxnPassword, // ✅ corrected
      sponsorId: sponsorId || null,
      walletBalance: 0,
      directIncome: 0,
      levelIncome: 0,
      planIncome: 0,
      spinIncome: 0,
      roiIncome: 0,
    });

    // 6️⃣ Save to database
    await newUser.save();

    // 7️⃣ Send response
    res.status(201).json({
      message: 'User created successfully',
      userId: newUser.userId
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Server error while creating user' });
  }
});


 

// ✅ Get all blocked users
router.get("/blocked-users", async (req, res) => {
  try {
    const users = await User.find({ isBlocked: true }).sort({ createdAt: -1 });
    // add blockedAt timestamp if you track it
    const formatted = users.map((u) => ({
      _id: u._id,
      userId: u.userId,
      name: u.name,
      email: u.email,
      status: u.isBlocked ? "Blocked" : "Active",
      blockedAt: u.updatedAt, // assuming last update was block time
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Unblock a user
router.put("/unblock-user/:userId", async (req, res) => {
  try {
const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = false;
    await user.save();
    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Optional: Block a user
router.put("/block-user/:userId", async (req, res) => {
  try {
const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = true;
    await user.save();
    res.json({ message: "User blocked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// Get all deposits with user names
router.get('/deposits', verifyAdmin, async (req, res) => {
  try {
    const deposits = await Deposit.find().sort({ createdAt: -1 });
    const userIds = deposits.map(dep => dep.userId);
    const users = await User.find({ userId: { $in: userIds } });

    const userMap = Object.fromEntries(users.map(u => [u.userId, u.name]));

    const enriched = deposits.map(dep => ({
      ...dep.toObject(),
      name: userMap[dep.userId] || 'Unknown'
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Failed to fetch deposits:', err);
    res.status(500).json({ message: 'Failed to fetch deposits' });
  }
});





// routes/admin.js

// POST /api/admin/manual-deposit
// GET /api/admin/manual-deposits
// place near other admin routes in routes/admin.js
 
 
 

 



// Get deduplicated top-up users
// Get deduplicated top-up users
router.get('/topup-users', verifyAdmin, async (req, res) => {
  try {
    const topups = await Transaction.aggregate([
      { $match: { type: 'topup' } },
      {
        $group: {
          _id: {
            userId: "$userId",
            amount: "$amount",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
          },
          latest: { $last: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latest" } },
      { $sort: { date: -1 } }
    ]);

    const userIds = [...new Set(topups.map(t => t.userId))];
    
    // ✅ FIX: Fetch 'mobile' along with userId and name
    const users = await User.find({ userId: { $in: userIds } }, { userId: 1, name: 1, mobile: 1 });

    // ✅ FIX: Save entire user object in map so we can extract name AND mobile
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const result = topups.map(tx => ({
      _id: tx._id,
      userId: tx.userId,
      name: userMap[tx.userId]?.name || 'Unknown',
      mobile: userMap[tx.userId]?.mobile || 'N/A', // ✅ Sent to frontend
      topUpAmount: tx.amount,
      topUpDate: tx.date || tx.createdAt
    }));

    res.json(result);
  } catch (err) {
    console.error('Error in /topup-users:', err);
    res.status(500).json({ error: 'Failed to fetch top-up users' });
  }
});

router.get("/transactions", verifyAdmin, async (req, res) => {
  try {
    // Fetch transactions and users in parallel
    const [transactions, users] = await Promise.all([
      Transaction.find().sort({ createdAt: -1 }).lean(),
      User.find({}, { userId: 1, name: 1 }).lean(),
    ]);

    // Map userId -> name
    const userMap = Object.fromEntries(users.map(u => [u.userId, u.name]));

    // Format transactions
    const formatted = transactions.map(tx => ({
      _id: tx._id,
      userId: tx.userId,
      name: userMap[tx.userId] || "Unknown",
      type: tx.type,
      amount: tx.amount || 0,
      source: tx.source || "-",           // Show "-" if null
      description: tx.description || "",  // Optional description
      fromUserId: tx.fromUserId || null,
      toUserId: tx.toUserId || null,
      fromName: tx.fromUserId ? userMap[tx.fromUserId] || "N/A" : "-",
      toName: tx.toUserId ? userMap[tx.toUserId] || "N/A" : "-",
      package: tx.package || null,
      plan: tx.plan || null,
      level: tx.level || null,
      date: tx.date || tx.createdAt || new Date(),
      createdAt: tx.createdAt || new Date(),
      updatedAt: tx.updatedAt || new Date(),
      
      // 🔥 YAHAN MAIN CHANGE HUA HAI: Hash ab frontend par jayega!
      txnHash: tx.txnHash || tx.txHash || null, 
      status: tx.status || "completed"
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});




router.get('/direct-income', verifyAdmin, async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;
    const filter = { type: 'direct_income' };

    if (userId) filter.userId = Number(userId);
    if (fromDate || toDate) filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);

    // Fetch transactions
    const incomes = await Transaction.find(filter).sort({ createdAt: -1 });

    // Format response (no names, just IDs)
    const formatted = incomes.map(inc => ({
      _id: inc._id,
      userId: inc.userId,
      fromUserId: inc.fromUserId || '-',
      packageName: inc.package || '-',
      amount: inc.amount,
      createdAt: inc.createdAt,
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching direct incomes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route: GET /api/admin/level-income
// Route: GET /api/admin/level-income
// Route: GET /api/admin/level-income
router.get('/level-income', verifyAdmin, async (req, res) => {
  try {
    const { userId, fromDate, toDate, level } = req.query;
    const filter = { type: 'level_income' };

    // Filter by userId if provided
    if (userId) filter.userId = Number(userId);

    // Filter by level if provided
    if (level) filter.level = Number(level);

    // Filter by date range
    if (fromDate || toDate) filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);

    // Fetch transactions
    const incomes = await Transaction.find(filter).sort({ createdAt: -1 });

    // Format response
    const formatted = incomes.map(inc => ({
      _id: inc._id,
      userId: inc.userId,
      fromUserId: inc.fromUserId || '-',
      packageName: inc.package || '-',
      amount: inc.amount,
      level: inc.level || '-',       // <-- added level
      createdAt: inc.createdAt,
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching level incomes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});





// GET /api/admin/spin-income

// 🔹 Admin: Update user spins or transaction amount
router.get("/spin-income", verifyAdmin, async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    // Build filter for spin_income, buy_spin, and topup_spin transactions
    const filter = { type: { $in: ["spin_income", "buy_spin", "topup_spin"] } };
    if (userId) filter.userId = Number(userId);
    if (fromDate || toDate) filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);

    // Fetch transactions
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

    // Extract unique userIds
    const userIds = [...new Set(transactions.map(tx => tx.userId))];

    // Fetch user details
    const users = await User.find(
      { userId: { $in: userIds } },
      { userId: 1, name: 1 } // only needed fields
    );

    // Map userId to { name, availableSpins, usedSpins }
    const userMap = {};
    for (const u of users) {
      const availableSpins = await Spin.countDocuments({ userId: u.userId, used: false });
      const usedSpins = await Spin.countDocuments({ userId: u.userId, used: true });
      userMap[u.userId] = { name: u.name || "-", availableSpins, usedSpins };
    }

    // Format transactions with user info
    const formatted = transactions.map(tx => {
      const user = userMap[tx.userId] || { name: "-", availableSpins: 0, usedSpins: 0 };
      return {
        _id: tx._id,
        userId: tx.userId,
        name: user.name,
        availableSpins: user.availableSpins,
        usedSpins: user.usedSpins,
        amount: tx.amount,
        type: tx.type,              // spin_income, buy_spin, topup_spin
        description: tx.description,
        createdAt: tx.createdAt,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching spin transactions:", err);
    res.status(500).json({ message: "Server error" });
  }
});




router.get('/wallet-summary', verifyAdmin, async (req, res) => {
  try {
    const { userId, fromDate, toDate, type, search } = req.query;

    const filter = {};

    // User filter
    if (userId) filter.userId = Number(userId);

    // Date filter
    if (fromDate || toDate) filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endOfDay;
    }

    // Type filter
    if (type && type !== "all") filter.type = type;

    // Fetch transactions
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

    // Collect unique userIds
    const userIds = [...new Set(transactions.map(tx => tx.userId))];

    // Fetch users with balances
    const users = await User.find(
      { userId: { $in: userIds } },
      {
        userId: 1,
        name: 1,
        walletBalance: 1,
        directIncome: 1,
        levelIncome: 1,
        planIncome: 1,
        spinIncome: 1,
        roiIncome: 1,
      }
    );

    // Build user map
    const userMap = Object.fromEntries(
      users.map(u => [
        u.userId,
        {
          name: u.name,
          walletBalance: u.walletBalance || 0,
          directIncome: u.directIncome || 0,
          levelIncome: u.levelIncome || 0,
          planIncome: u.planIncome || 0,
          spinIncome: u.spinIncome || 0,
          roiIncome: u.roiIncome || 0,
        },
      ])
    );

    // Format response
    let formatted = transactions.map(tx => ({
      _id: tx._id,
      userId: tx.userId,
      name: userMap[tx.userId]?.name || "-",
      type: tx.type,          // deposit, withdrawal, transfer, etc.
      amount: tx.amount,
      description: tx.description || "-", // optional
      createdAt: tx.createdAt,
      walletBalance: userMap[tx.userId]?.walletBalance || 0,
      directIncome: userMap[tx.userId]?.directIncome || 0,
      levelIncome: userMap[tx.userId]?.levelIncome || 0,
      planIncome: userMap[tx.userId]?.planIncome || 0,
      spinIncome: userMap[tx.userId]?.spinIncome || 0,
      roiIncome: userMap[tx.userId]?.roiIncome || 0,
    }));

    // Search filter (matches id/name/type/description)
    if (search) {
      const lower = search.toLowerCase();
      formatted = formatted.filter(
        tx =>
          tx.userId?.toString().includes(lower) ||
          tx.name?.toLowerCase().includes(lower) ||
          tx.type?.toLowerCase().includes(lower) ||
          tx.description?.toLowerCase().includes(lower)
      );
    }

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching wallet summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});


 

// ------------------------- CREDIT TO WALLET -------------------------
// Route: POST /credit
// Purpose: Transfer funds from a user's income (direct, level, spin) to their wallet balance
// Request Body:
// {
//   userId: Number,
//   transactionPassword: String,
//   credits: [
//     { source: "direct" | "level" | "spin", amount: Number }
//   ]
// }

router.post("/credit", async (req, res) => {
  try {
    const { userId, credits, transactionPassword } = req.body;

    // 1️⃣ Transaction password must be provided
    if (!transactionPassword)
      return res.status(400).json({
        success: false,
        message: "Transaction password is required",
      });

    // 2️⃣ Find the user by userId
    const user = await User.findOne({ userId });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // 3️⃣ Validate transaction password
    const isPasswordValid = await bcrypt.compare(transactionPassword, user.transactionPassword);
    if (!isPasswordValid)
      return res.status(401).json({ success: false, message: "Invalid transaction password" });

    // 4️⃣ Validate each credit item
    for (const { source, amount } of credits) {
      // Check valid source and positive amount
      if (amount <= 0 || !["direct", "level", "spin"].includes(source)) {
        return res.status(400).json({
          success: false,
          message: `Invalid credit source or amount for "${source}"`,
        });
      }

      // Check user has enough balance in the selected income
      if (amount > user[`${source}Income`]) {
        return res.status(400).json({
          success: false,
          message: `Cannot credit more than available ${source} balance`,
        });
      }
    }

    // 5️⃣ Apply credits
    for (const { source, amount } of credits) {
      // Deduct from user's income
      user[`${source}Income`] -= amount;

      // Add to wallet balance
      user.walletBalance += amount;

      // Record transaction in database
      await Transaction.create({
        userId: user.userId,
        type: "credit_to_wallet",      // Transaction type
        source,                        // Income source
        amount,                        // Amount credited
        description: `Credited $${amount} from ${source} income to wallet`,
        createdAt: new Date(),         // Timestamp
      });
    }

    // 6️⃣ Save updated user balances
    await user.save();

    // 7️⃣ Return response with updated balances
    res.json({
      success: true,
      message: "Credits added to wallet successfully",
      walletBalance: user.walletBalance,
      incomes: {
        direct: user.directIncome,
        level: user.levelIncome,
        spin: user.spinIncome,
      },
    });
  } catch (err) {
    // 8️⃣ Handle unexpected server errors
    console.error("Credit Wallet Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while crediting wallet",
    });
  }
});



 
// GET /api/admin/withdrawals
 

// GET all withdrawals with user info and schedule
// GET all withdrawals (flattened with schedule)
// GET /api/admin/withdrawals
// GET /api/admin/withdrawals
router.get('/withdrawals', verifyAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 }).lean();
    const users = await User.find({}, { userId: 1, name: 1, walletAddress: 1 }).lean();

    // userId → name, wallet
    const userMap = users.reduce((acc, u) => {
      acc[String(u.userId)] = {
        name: u.name || '-',
        walletAddress: u.walletAddress || ''
      };
      return acc;
    }, {});

    const showAll = req.query.all === 'true';

    const parseDate = (str) => {
      if (!str) return null;
      const [d, m, y] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = normalizeDate(new Date());

    const fromDate = req.query.from
      ? normalizeDate(parseDate(req.query.from))
      : today;

    const toDate = req.query.to
      ? normalizeDate(parseDate(req.query.to))
      : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const isInRange = (date) => {
      const d = normalizeDate(new Date(date));
      return d >= fromDate && d <= toDate;
    };

    const flattened = withdrawals.flatMap((w) => {
      const userKey = String(w.userId);

      // 🔹 NAME RESOLVE
      const resolvedName =
        w.name && String(w.name).trim() !== '-'
          ? w.name
          : userMap[userKey]?.name || '-';

      // 🔹 NON-SCHEDULE WALLET (parent)
      const parentWallet =
        w.status === 'approved'
          ? (w.walletAddress || '')
          : (w.walletAddress || userMap[userKey]?.walletAddress || '');

      // 🔹 WITH SCHEDULE
      if (Array.isArray(w.schedule) && w.schedule.length > 0) {
        let remainingGross = Number(w.grossAmount || 0);

        return w.schedule.map((day, index) => {
          const gross = Math.min(Number(day.grossAmount || 0), remainingGross);
          const fee = Number(day.fee || 0);
          const net = +(gross - fee).toFixed(2);
          remainingGross -= gross;

          const dateObj = day.date
            ? new Date(day.date)
            : new Date(new Date(w.createdAt).getTime() + index * 1000);

          // 🔐 FINAL WALLET LOCK LOGIC (DAY-WISE)
          const finalWallet =
            day.status === 'approved'
              ? (day.walletAddress || '')
              : (
                  day.walletAddress ||
                  w.walletAddress ||
                  userMap[userKey]?.walletAddress ||
                  ''
                );

          return {
            _id: `${w._id}-${index}`,
            withdrawalId: w._id,
            userId: w.userId,
            name: resolvedName,
            walletAddress: finalWallet, // ✅ FIXED
            source: w.source,
            grossAmount: gross,
            fee,
            netAmount: net,
            status: day.status || 'pending',
            date: dateObj,
            txnHash: w.txnHash || '',
            isInRange: isInRange(dateObj),
          };
        });
      }

      // 🔹 NO SCHEDULE (single withdrawal)
      const dateObj = new Date(w.createdAt);

      return [{
        _id: w._id,
        withdrawalId: w._id,
        userId: w.userId,
        name: resolvedName,
        walletAddress: parentWallet, // ✅ FIXED
        source: w.source,
        grossAmount: Number(w.grossAmount || 0),
        fee: Number(w.fee || 0),
        netAmount: +(Number(w.grossAmount || 0) - Number(w.fee || 0)).toFixed(2),
        status: w.status || 'pending',
        date: dateObj,
        txnHash: w.txnHash || '',
        isInRange: isInRange(dateObj),
      }];
    });

    const result = showAll ? flattened : flattened.filter(r => r.isInRange);
    result.sort((a, b) => b.grossAmount - a.grossAmount);

    res.json({ success: true, withdrawals: result });
  } catch (err) {
    console.error("Withdrawals fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





// APPROVE a withdrawal (single withdrawal record)
// Sirf status update karne ke liye
router.put('/withdrawals/approve/:id', verifyAdmin, async (req, res) => {
  try {
    const fullId = req.params.id;
    const { txnHash } = req.body;

    // 1. Agar ID mein '-' hai (matlab schedule wali row hai), toh asli ID alag karo
    let actualId = fullId;
    let dayIndex = null;

    if (fullId.includes('-')) {
      const parts = fullId.split('-');
      actualId = parts[0]; // Ye asli MongoDB ID hogi
      dayIndex = parseInt(parts[1]); // Ye schedule ka index hoga
    }

    const withdrawal = await Withdrawal.findById(actualId);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    // 2. Agar schedule hai, toh sirf us din ko approve karo
    if (dayIndex !== null && withdrawal.schedule && withdrawal.schedule[dayIndex]) {
      withdrawal.schedule[dayIndex].status = "approved";
      
      // Agar saare days approve ho gaye, toh main status bhi approve kar do
      const allDone = withdrawal.schedule.every(d => d.status === "approved");
      if (allDone) {
        withdrawal.status = "approved";
        withdrawal.txnHash = txnHash;
      }
    } else {
      // 3. Normal withdrawal (binna schedule wala)
      withdrawal.status = "approved";
      withdrawal.txnHash = txnHash;
    }

    await withdrawal.save();
    res.json({ success: true, message: "Approved successfully", withdrawal });

  } catch (err) {
    console.error("Approve Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// APPROVE a dummy txn with txnHash
// ✅ Dummy Transaction Route (Fixed for Schedule IDs)
router.put('/withdrawals/dummy/:id', verifyAdmin, async (req, res) => {
  try {
    const { txnHash } = req.body;
    if (!txnHash) return res.status(400).json({ message: 'Transaction hash required' });

    const fullId = req.params.id;
    let actualId = fullId;
    let dayIndex = null;

    // 1. Agar ID mein '-' hai, toh asli ID aur index nikaalo
    if (fullId.includes('-')) {
      const parts = fullId.split('-');
      actualId = parts[0];
      dayIndex = parseInt(parts[1]);
    }

    const withdrawal = await Withdrawal.findById(actualId);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    // 2. Agar schedule hai, toh sirf us specific din ko approve karo
    if (dayIndex !== null && withdrawal.schedule && withdrawal.schedule[dayIndex]) {
      withdrawal.schedule[dayIndex].status = 'approved';
      withdrawal.schedule[dayIndex].walletAddress = withdrawal.schedule[dayIndex].walletAddress || withdrawal.walletAddress;
      
      // Check agar saare days done hain
      const allDone = withdrawal.schedule.every(day => day.status === 'approved');
      if (allDone) {
        withdrawal.status = 'approved';
        withdrawal.txnHash = txnHash;
      }
    } else {
      // 3. Normal withdrawal ke liye
      withdrawal.status = 'approved';
      withdrawal.txnHash = txnHash;
    }

    await withdrawal.save();
    res.json({ success: true, message: 'Dummy transaction approved' });
  } catch (err) {
    console.error("Dummy Approve Error:", err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// REJECT a withdrawal
router.put('/withdrawals/reject/:id', verifyAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    if (Array.isArray(withdrawal.schedule)) {
      withdrawal.schedule = withdrawal.schedule.map(day => ({ ...day, status: 'rejected' }));
    }
    withdrawal.status = 'rejected';
    await withdrawal.save();

    res.json({ success: true, message: 'Withdrawal rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




// Admin update user password
router.put('/admin/update-password/:userId', verifyAdmin, async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long.' });
  }

  try {
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ system updated password for userId ${userId}`);
    res.json({ message: 'Password updated successfully by system' });
  } catch (error) {
    console.error("❗ Error updating password:", error);
    res.status(500).json({ message: 'Server error' });
  }
});



// ✅ Corrected Route for Admin User Search (Added here)
// Isse admin kisi bhi ek user ko search karega toh usko plain text password dikhega
router.get('/user/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) }).lean();
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Yahan hum password aur transactionPassword hide NAHI kar rahe hain
    res.json({ user: user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// routes/admin.js ke andar
// routes/admin.js ke andar
router.get('/search-user/:userId', verifyAdmin, async (req, res) => {
  try {
    // 1. Pehle user ko dhundo
    const user = await User.findOne({ userId: Number(req.params.userId) }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. ✅ NAYA LOGIC: Agar iska koi sponsorId hai, toh database se uska naam nikalo
    if (user.sponsorId) {
      const sponsor = await User.findOne({ userId: Number(user.sponsorId) }).select('name').lean();
      // Agar sponsor mila toh uska naam daalo, warna "Unknown" likh do
      user.sponsorName = sponsor ? sponsor.name : "Unknown"; 
    } else {
      user.sponsorName = "N/A"; // Agar kisi ne refer nahi kiya
    }

    // Ensure we are sending EVERYTHING, including passwords and the new sponsorName
    res.json({ user: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Admin update user data safely
// ✅ Admin update user + update ONLY pending withdrawals wallet address
// 🔐 Admin update user (FINAL)
// 🔐 Admin update user (FINAL - Updated to Plain Text Password)
router.put('/:userId', verifyAdmin, async (req, res) => {
  try {
    const { password, transactionPassword, walletAddress, ...otherFields } = req.body;
    const updateData = { ...otherFields };

    if (walletAddress) updateData.walletAddress = walletAddress;
    
    // ✅ Yahan se bcrypt hata diya hai. Seedha save hoga.
    if (password) updateData.password = password;
    if (transactionPassword) updateData.transactionPassword = transactionPassword;

    const updatedUser = await User.findOneAndUpdate(
      { userId: Number(req.params.userId) },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 ONLY PENDING WITHDRAWALS UPDATE
    if (walletAddress) {
      await Withdrawal.updateMany(
        { userId: Number(req.params.userId), status: "pending" },
        { $set: { walletAddress } }
      );
      await Withdrawal.updateMany(
        {
          userId: Number(req.params.userId),
          "schedule.status": "pending"
        },
        {
          $set: { "schedule.$[elem].walletAddress": walletAddress }
        },
        {
          arrayFilters: [{ "elem.status": "pending" }]
        }
      );
    }

    res.json({
      message: "✅ User updated successfully",
      user: updatedUser
    });

  } catch (err) {
    console.error("❌ User update failed:", err);
    res.status(500).json({ message: "Update failed" });
  }
});



module.exports = router;
