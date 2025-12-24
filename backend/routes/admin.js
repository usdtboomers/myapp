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
 const Spin = require("../models/Spin");
 
const { ethers } = require('ethers');
require('dotenv').config();

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSC_NODE_URL = process.env.BSC_NODE_URL;
const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;

const provider = new ethers.providers.JsonRpcProvider(BSC_NODE_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);


const tokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
];

const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, tokenABI, wallet);
 

 
// Admin impersonate user
router.get('/impersonate/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userToken = jwt.sign(
      { userId: user.userId, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token: userToken, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard summary
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      todayUsers,
      todayUserDocs,
      totalDepositSum,
      todayDepositSum,
      totalWithdrawalSum,
      todayWithdrawalSum
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.find({ createdAt: { $gte: today } }, { userId: 1 }),
      Deposit.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Deposit.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Withdrawal.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Withdrawal.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);

    res.json({
      totalUsers,
      todayUsers,
      todayUserIds: todayUserDocs.map(user => user.userId),
      totalDeposit: totalDepositSum[0]?.total || 0,
      todayDeposit: todayDepositSum[0]?.total || 0,
      totalWithdrawal: totalWithdrawalSum[0]?.total || 0,
      todayWithdrawal: todayWithdrawalSum[0]?.total || 0
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



// Admin reverses a transaction
 

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
    const users = await User.find({ userId: { $in: userIds } }, { userId: 1, name: 1 });

    const userMap = Object.fromEntries(users.map(u => [u.userId, u.name]));

    const result = topups.map(tx => ({
      _id: tx._id,
      userId: tx.userId,
      name: userMap[tx.userId] || 'Unknown',
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
router.put('/withdrawals/approve/:id', verifyAdmin, async (req, res) => {
  try {
    const idParam = req.params.id;

    if (idParam.includes('-')) {
      const [withdrawalId, dayIndex] = idParam.split('-');
      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

      const index = parseInt(dayIndex);
      if (!withdrawal.schedule[index]) {
        return res.status(400).json({ message: 'Invalid schedule day' });
      }

      withdrawal.schedule[index].status = "approved";

      // 🔐 WALLET LOCK
      withdrawal.schedule[index].walletAddress =
        withdrawal.schedule[index].walletAddress ||
        withdrawal.walletAddress;

      if (withdrawal.schedule.every(d => d.status === "approved")) {
        withdrawal.status = "approved";
      }

      await withdrawal.save();
      return res.json({ success: true, message: "Approved", withdrawal });
    }

    // FULL approve
    const withdrawal = await Withdrawal.findById(idParam);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    withdrawal.schedule = withdrawal.schedule.map(d => ({
      ...d,
      status: "approved",
      walletAddress: d.walletAddress || withdrawal.walletAddress
    }));

    withdrawal.status = "approved";
    await withdrawal.save();

    res.json({ success: true, message: "Approved", withdrawal });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// APPROVE a dummy txn with txnHash
router.put('/withdrawals/dummy/:id', verifyAdmin, async (req, res) => {
  try {
    const { txnHash } = req.body;
    if (!txnHash) return res.status(400).json({ message: 'Transaction hash required' });

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    if (Array.isArray(withdrawal.schedule)) {
      withdrawal.schedule = withdrawal.schedule.map(day => ({ ...day, status: 'approved' }));
    }
    withdrawal.status = 'approved';
    withdrawal.txnHash = txnHash;
    await withdrawal.save();

    res.json({ success: true, message: 'Dummy transaction approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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

// Admin update user data safely
// ✅ Admin update user + update ONLY pending withdrawals wallet address
// 🔐 Admin update user (FINAL)
router.put('/:userId', verifyAdmin, async (req, res) => {
  try {
    const { password, txnPassword, walletAddress, ...otherFields } = req.body;
    const updateData = { ...otherFields };

    if (walletAddress) updateData.walletAddress = walletAddress;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (txnPassword) updateData.transactionPassword = await bcrypt.hash(txnPassword, 10);

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
      // parent pending
      await Withdrawal.updateMany(
        { userId: Number(req.params.userId), status: "pending" },
        { $set: { walletAddress } }
      );

      // schedule pending days
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
