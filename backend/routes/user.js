const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
 const TopUp = require('../models/TopUp'); 
 

 const checkFeature = require("../middleware/checkFeatureEnabled");
// Controllers
const {
  getUserById,
  blockUser,
  unblockUser,
  getAllUsers,
} = require('../controllers/userController');

// ---------------------------
// Helper: Check if target is in downline
const isUserInDownline = async (rootUserId, targetUserId) => {
  const visited = new Set();
  const queue = [rootUserId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const downlines = await User.find({ sponsorId: current }).select('userId');
    for (const user of downlines) {
      if (user.userId === targetUserId) return true;
      queue.push(user.userId);
    }
  }

  return false;
};

// ---------------------------
// Referral Tree
router.get('/tree/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const referrals = await User.find({ sponsorId: userId });

    const tree = {
      userId: user.userId,
      name: user.name,
      children: referrals.map(r => ({ userId: r.userId, name: r.name, children: [] }))
    };

    res.json(tree);
  } catch (err) {
    console.error('Error generating tree:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/// Helper Function: Pure Team Count nikalne ke liye (Recursive)
// Isko route ke bahar ya andar define kar sakte hain
const getDownlineCount = async (sponsorId) => {
  const referrals = await User.find({ sponsorId: Number(sponsorId) });
  let count = referrals.length;
  for (const r of referrals) {
    count += await getDownlineCount(r.userId);
  }
  return count;
};

// ---------------------------
// 1. UPDATED: Direct Team Route
// ---------------------------
router.get('/direct-team/:userId', async (req, res) => {
  try {
    const currentUserId = Number(req.params.userId);

    // Step 1: Login user ki khud ki Total Team nikalna (Top Card ke liye)
    const myTotalTeamCount = await getDownlineCount(currentUserId);

    // Step 2: Direct Members fetch karna
    const directMembers = await User.find({ sponsorId: currentUserId });

    // Step 3: Har Direct Member ke liye stats calculate karna
    const teamWithStats = await Promise.all(
      directMembers.map(async (member, i) => {
        // A. Member ke khud ke Directs count karna
        const memberDirectsCount = await User.countDocuments({ sponsorId: member.userId });

        // B. Member ki khud ki Total Team calculate karna (Recursive)
        const memberTeamSize = await getDownlineCount(member.userId);

        return {
          srNo: i + 1,
          ...member.toObject(),
          // Ye keys Frontend me use hongi:
          totalDirects: memberDirectsCount, 
          totalTeam: memberTeamSize        
        };
      })
    );

    res.json({
      team: teamWithStats,      // Table ka data
      totalTeam: myTotalTeamCount // Upar wale card ke liye data
    });

  } catch (err) {
    console.error("Error in direct-team:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// 2. All Team (No Change Needed, but kept for reference)
// ---------------------------
router.get('/all-team/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const getDownline = async (sponsorId, level = 1) => {
      const referrals = await User.find({ sponsorId: Number(sponsorId) });
      let all = referrals.map(r => ({ ...r.toObject(), level }));
      for (const r of referrals) {
        all = [...all, ...(await getDownline(r.userId, level + 1))];
      }
      return all;
    };

    const allTeam = await getDownline(userId);
    const teamWithSrNo = allTeam.map((u, i) => ({ srNo: i + 1, ...u }));

    const levelWiseCount = {};
    teamWithSrNo.forEach(u => {
      levelWiseCount[u.level] = (levelWiseCount[u.level] || 0) + 1;
    });

    res.json({
      team: teamWithSrNo,
      totalTeamCount: teamWithSrNo.length,
      directCount: levelWiseCount[1] || 0,
      indirectCount: teamWithSrNo.length - (levelWiseCount[1] || 0),
      levelWiseCount
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// Wallet History
router.get('/wallet-history/:userId', async (req, res) => {
  try {
    const txs = await Transaction.find({
      userId: Number(req.params.userId),
      type: { $in: ['topup', 'deposit', 'transfer'] }
    }).sort({ date: -1 });

    res.json({ history: txs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

 // Block/Unblock Users
router.put('/block/:id', blockUser);
router.put('/unblock/:id', unblockUser);

// ---------------------------
// All Users
router.get('/', getAllUsers);

// ---------------------------
  

// ---------------------------
// Top-up Route with Daily ROI
// 📌 Top-up API
router.put(
  '/topup/:userId',
  authMiddleware,
  checkFeature("allowTopUps"), // ✅ Add this
  async (req, res) => {  try {
    const targetUserId = Number(req.params.userId);
    const { amount, transactionPassword } = req.body;

const currentUser = await User.findOne({ userId: req.user.userId });

// 🔹 SAB USERS KE LIYE TRANSACTION PASSWORD CHECK
if (!transactionPassword) {
  return res.status(400).json({ message: "Transaction password is required" });
}

const isValidPassword = await bcrypt.compare(
  transactionPassword,
  currentUser.transactionPassword
);
if (!isValidPassword) {
  return res.status(403).json({ message: "Invalid transaction password" });
}

// ===============================
// 🔴 PROMO USER TOPUP (DISPLAY ONLY)
// ===============================
if (currentUser.role === "promo") {
  const targetUserId = Number(req.params.userId);
  const { amount } = req.body;

  await Transaction.create({
    userId: targetUserId,
    type: "topup",
    amount,
    description:
      targetUserId === currentUser.userId
        ? "PROMO SELF TOPUP"
        : "TOPUP (PROMOTION)",
    isPromo: true,
    remark:
      targetUserId === currentUser.userId
        ? "PROMO SELF TOPUP"
        : "TOPUP (PROMOTION)",
    date: new Date(),
  });

  return res.json({
    success: true,
    message: "PROMO TOPUP RECORDED (PASSWORD VERIFIED)",
  });
}

// 🔹 Normal user flow continues here...
if (!amount)
  return res.status(400).json({ message: 'Missing amount.' });

    
    if (!currentUser || currentUser.role !== 'user')
      return res.status(403).json({ message: 'Only regular users can perform top-up.' });

    

    const targetUser = await User.findOne({ userId: targetUserId });
    if (!targetUser)
      return res.status(404).json({ message: 'Target user not found' });

    const isSelf = targetUserId === currentUser.userId;
    const isInDownline =
      isSelf || (await isUserInDownline(currentUser.userId, targetUserId));
    if (!isInDownline)
      return res.status(403).json({ message: 'Not authorized to top up this user.' });

    if (targetUser.dailyROI.some(p => p.amount === amount))
      return res
        .status(400)
        .json({ message: `Package $${amount} already purchased.` });

   // 🔐 Wallet checks ONLY for normal users
if (currentUser.role === 'user' && currentUser.walletBalance < amount)
  return res.status(400).json({ message: 'Insufficient balance in wallet' });

// 🔻 Deduct from funder wallet (ONLY user)
if (currentUser.role === 'user') {
  currentUser.walletBalance -= amount;
  await currentUser.save();
}


    const packageToPlan = {
      10: "plan1",
      25: "plan2",
      50: "plan3",
      100: "plan4",
      200: "plan5",
      500: "plan6",
      1000: "plan7"
    };
    const assignedPlan = packageToPlan[amount] || "plan1";

    const createTransaction = async (data) =>
      Transaction.create({ ...data, date: new Date() });
if (isSelf) {
  // ✅ SELF TOP-UP → ONLY ONE TRANSACTION
  await createTransaction({
    userId: targetUser.userId,
    type: "topup",
    source: "topup",
    amount,
    fromUserId: currentUser.userId,
    toUserId: targetUser.userId,
    description: `Self top-up of $${amount}`,
    package: amount,
    plan: assignedPlan,
  });
} else {
  // ✅ DOWNLINE TOP-UP → TWO TRANSACTIONS
  await createTransaction({
    userId: currentUser.userId,
    type: "topup",
    source: "topup",
    amount,
    fromUserId: currentUser.userId,
    toUserId: targetUser.userId,
    description: `Top-up sent to user ${targetUser.userId}`,
    package: amount,
    plan: assignedPlan,
  });

  await createTransaction({
    userId: targetUser.userId,
    type: "topup",
    source: "topup",
    amount,
    fromUserId: currentUser.userId,
    toUserId: targetUser.userId,
    description: `Top-up received from user ${currentUser.userId}`,
    package: amount,
    plan: assignedPlan,
  });
}


    // Log in TopUp collection
    await TopUp.create({
      funderUserId: currentUser.userId,
      targetUserId: targetUser.userId,
      amount,
      plan: assignedPlan,
      date: new Date(),
    });

    // Apply top-up to target user
    targetUser.topUpAmount = Math.max(targetUser.topUpAmount || 0, amount);
    targetUser.topUpDate = new Date();
    targetUser.isToppedUp = true;

    const dailyIncome = amount;
    const maxDays = 10;

    targetUser.dailyROI.push({
      amount,
      startDate: new Date(),
      claimedDays: 1,
      maxDays,
      totalEarned: dailyIncome,
      plan: assignedPlan,
    });

    // Credit Day 1 ROI instantly
    targetUser.planIncome =
      targetUser.planIncome || {
        plan1: 0, plan2: 0, plan3: 0,
        plan4: 0, plan5: 0, plan6: 0, plan7: 0
      };
    targetUser.planIncome[assignedPlan] += dailyIncome;

    await createTransaction({
      userId: targetUser.userId,
      type: "plan_income",
      source: "plan",
      amount: dailyIncome,
      description: `Day 1 ROI credited for package $${amount}`,
      package: amount,
      plan: assignedPlan,
    });

    // Direct & Level Income
    const distributeLevelIncome = async (
      currentUserId,
      topupUserId,
      pkgAmount,
      level = 1
    ) => {
      if (level > 20) return;

      const current = await User.findOne({ userId: currentUserId });
      if (!current?.sponsorId) return;

      const sponsor = await User.findOne({ userId: current.sponsorId });
      if (!sponsor) return;

      let rate = 0;
      if (level <= 5) rate = 4;
      else if (level <= 10) rate = 3;
      else if (level <= 15) rate = 2;
      else if (level <= 20) rate = 1;

      if (rate > 0) {
        const income = (pkgAmount * rate) / 100;
        sponsor.levelIncome = (sponsor.levelIncome || 0) + income;
        await sponsor.save();

        await createTransaction({
          userId: sponsor.userId,
          fromUserId: topupUserId,
          type: "level_income",
          source: "level",
          amount: income,
          description: `Level ${level} income from user ${topupUserId}`,
          package: pkgAmount,
          plan: assignedPlan,
        });
      }

      await distributeLevelIncome(
        sponsor.userId,
        topupUserId,
        pkgAmount,
        level + 1
      );
    };

    if (targetUser.sponsorId) {
      const sponsor = await User.findOne({ userId: targetUser.sponsorId });
      if (sponsor) {
        const directIncome = (amount * 25) / 100;
        sponsor.directIncome =
          (sponsor.directIncome || 0) + directIncome;
        await sponsor.save();

        await createTransaction({
          userId: sponsor.userId,
          fromUserId: targetUser.userId,
          type: "direct_income",
          source: "direct",
          amount: directIncome,
          description: `Direct income from user ${targetUser.userId}`,
          package: amount,
          plan: assignedPlan,
        });

        await distributeLevelIncome(
          sponsor.userId,
          targetUser.userId,
          amount
        );
      }
    }

    await targetUser.save();

    res.json({
      message: `Top-up successful: Package $${amount} purchased.`,
      funderUserId: currentUser.userId,
      targetUserId: targetUser.userId,
      funderBalance: currentUser.walletBalance,
    });

  } catch (err) {
    console.error('Top-up Error:', err);
    res.status(500).json({ message: 'Server error during top-up' });
  }
});




 // Downline Team Business Details
router.get("/binary-summary/:userId", async (req, res) => {  
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const strong = user.strongLegBusiness || 0;
    const weak   = user.weakLegBusiness || 0;

    const totalMatching = Math.min(strong, weak);
    const carryForward  = Math.abs(strong - weak);

    res.json({
      strongLegBusiness: strong,
      weakLegBusiness: weak,
      totalMatching,
      carryForward,

      // 🔷 current unreleased / available binary
      binaryIncome: user.binaryIncome || 0,

      // 🔥 VERY IMPORTANT FOR UI (eligibility)
      hasWithdrawn100: user.hasWithdrawn100 === true,

      // 🔥 optional (agar future me total released track karna ho)
      totalEarnedSoFar: user.totalBinaryEarned || user.binaryIncome || 0,
    });
  } catch (err) {
    console.error("Binary summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



router.get('/global-team-count/:userId', async (req, res) => {
  try {
    // System me total users
    const users = await User.find({}, { userId: 1, _id: 0 }).lean();
    const count = users.length;

    res.json({ count });
  } catch (err) {
    console.error('Error fetching global team count:', err);
    res.status(500).json({ message: 'Failed to fetch global team count' });
  }
});





// GET Downline Business
router.get("/downline-business/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // Find main user
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Recursive function to fetch all downline users
    const getDownline = async (sponsorId, level = 1) => {
      const referrals = await User.find({ sponsorId });
      let all = [];

      for (const r of referrals) {
        // Fetch transactions only of type topup or withdrawal
       const transactions = await Transaction.find({
  userId: r.userId,
  type: { $in: ["topup", "withdrawal"] }
})
  .lean()
  .sort({ date: -1 });

transactions.forEach(t => {
  if (t.amount && typeof t.amount === "object") {
    t.amount = parseFloat(t.amount.toString());
  }
});


        const totalTopup = transactions
          .filter(t => t.type === "topup")
.reduce((sum, t) => sum + Number(t.amount || 0), 0);

       const totalWithdrawal = transactions
  .filter(t => t.type === "withdrawal")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);


        // NEW: totalBusiness is now sum of all transactions
const totalBusiness = transactions
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        all.push({
          userId: r.userId,
          name: r.name || "N/A",
          level,
          totalTopup,
          totalWithdrawal,
          totalBusiness,
          transactions: transactions.map(t => ({
            type: t.type,
            amount: t.amount,
            date: t.date,
          })),
        });

        // Recurse for next level
        const subTeam = await getDownline(r.userId, level + 1);
        all = [...all, ...subTeam];
      }

      return all;
    };

    // Fetch full downline
    const allTeam = await getDownline(userId);

    // Summary calculations
const totalTopup = allTeam.reduce(
  (sum, u) => sum + Number(u.totalTopup || 0),
  0
); 
   const totalWithdrawal = allTeam.reduce(
  (sum, u) => sum + Number(u.totalWithdrawal || 0),
  0
);
    // NEW: totalBusiness = sum of all individual totalBusiness
const totalBusiness = allTeam.reduce(
  (sum, u) => sum + Number(u.totalBusiness || 0),
  0
);

    const directCount = allTeam.filter(u => u.level === 1).length;
    const indirectCount = allTeam.filter(u => u.level > 1).length;

    // Return response
    res.json({
      totalTopup,
      totalWithdrawal,
      totalBusiness,
      totalTeamCount: allTeam.length,
      directCount,
      indirectCount,
      team: allTeam.map((u, idx) => ({
        srNo: idx + 1,
        ...u,
      })),
    });

  } catch (err) {
    console.error("Error fetching downline business:", err);
    res.status(500).json({ message: "Server error" });
  }
});







// routes/user.js
router.get('/sponsor-name/:id', async (req, res) => {
  try {
    const sponsor = await User.findOne({ userId: req.params.id });
    if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });
    res.json({ name: sponsor.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

 
// ---------------------------
 router.get('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findOne({ userId }).select('-password -txnPassword -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------
// Update user
router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      walletAddress,
      oldTxnPassword
    } = req.body;

    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 🔐 txn password verify
    const validTxn = await bcrypt.compare(oldTxnPassword, user.transactionPassword);
    if (!validTxn)
      return res.status(403).json({ message: 'Invalid transaction password' });

    const isAdmin = req.user.role === 'admin';
    const isWalletChanged =
      walletAddress && walletAddress !== user.walletAddress;

    /* ===========================
       🔒 WALLET ADDRESS RULES
       =========================== */
    if (isWalletChanged && !isAdmin) {

      // ❌ Withdrawal hua hai → lock
      if (user.pendingWithdrawals &&
          Object.values(user.pendingWithdrawals).some(v => v > 0)) {
        return res.status(403).json({
          message: 'Wallet address locked due to withdrawal'
        });
      }

      const now = new Date();

      // Reset window if 24h passed
      if (
        !user.walletAddressChangeWindowStart ||
        now - user.walletAddressChangeWindowStart > 24 * 60 * 60 * 1000
      ) {
        user.walletAddressChangeCount = 0;
        user.walletAddressChangeWindowStart = now;
      }

      // ❌ limit reached
      if (user.walletAddressChangeCount >= 2) {
        return res.status(403).json({
          message: 'Wallet address can be changed only 2 times in 24 hours'
        });
      }

      // ✅ save history
      if (user.walletAddress) {
        user.walletAddressHistory.push({
          address: user.walletAddress,
          changedAt: now,
        });
      }

      user.walletAddress = walletAddress;
      user.walletAddressChangeCount += 1;
    }

    /* ===========================
       NORMAL PROFILE UPDATE
       =========================== */
    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;

    await user.save();
    res.json({ user });

  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Profile update failed' });
  }
});


// ---------------------------
// Password Change
router.put('/change-password/:userId', async (req, res) => {
  const { oldPassword, newPassword, oldTxnPassword, newTxnPassword } = req.body;
  try {
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (oldPassword && newPassword) {
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return res.status(403).json({ message: 'Incorrect old password' });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (oldTxnPassword && newTxnPassword) {
      const matchTxn = await bcrypt.compare(oldTxnPassword, user.transactionPassword);
      if (!matchTxn) return res.status(403).json({ message: 'Incorrect old transaction password' });
      user.transactionPassword = await bcrypt.hash(newTxnPassword, 10);
    }

    await user.save();
    res.json({ message: 'Password(s) updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
