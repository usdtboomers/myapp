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
// All Users
 
// 🔥 ADMIN ROUTE: Purane Missed Rewards Dilane Ke Liye (Bas Ek Baar Chalana Hai)
router.get('/fix-missed-rewards', async (req, res) => {
    try {
        console.log("Fixing missed rewards started...");
        // Un sabhi users ko nikalenge jinka topup 30 ya usse zyada hai
        const eligibleUsers = await User.find({ topUpAmount: { $gte: 30 } });
        let count = 0;

        for (let user of eligibleUsers) {
            // Ye function automatically check karega aur agar condition puri hogi toh reward de dega
            await checkAndAwardManagerReward(user.userId);
            count++;
        }

        console.log(`✅ Missed rewards distribution complete for ${count} users.`);
        res.json({ 
            success: true, 
            message: `Done! Checked ${count} users and distributed all missing rewards.` 
        });
    } catch (err) {
        console.error("Error fixing rewards:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------------------
// (Yahan se aapka aage ka code start hoga, jaise Top-up Route wagarah...)

// ---------------------------
// Top-up Route with Daily ROI
// 📌 Top-up API
// 🛑 Top par ye import zaroor karna (agar rewardLogic.js utils folder me banaya hai)
// 🛑 Top par ye import zaroor check kar lena
 
const { checkAndAwardManagerReward } = require('../utils/rewardLogic'); 

router.put(
  '/topup/:userId',
  authMiddleware,
  checkFeature("allowTopUps"),
  async (req, res) => {
    try {
      const targetUserId = Number(req.params.userId);
      const { amount, transactionPassword } = req.body;

      // 🔹 1. User & Password Check
      const currentUser = await User.findOne({ userId: req.user.userId });
      if (!currentUser) return res.status(404).json({ message: "Current user not found" });

      if (!transactionPassword) {
        return res.status(400).json({ message: "Transaction password is required" });
      }
      
      const isValidPassword = (transactionPassword === currentUser.transactionPassword);
      if (!isValidPassword) {
        return res.status(403).json({ message: "Invalid transaction password" });
      }

      if (!amount) return res.status(400).json({ message: 'Missing amount.' });

      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

      // 🔥 CHECK: Is this a Promo User?
      const isPromo = currentUser.role === 'promo';

      // 🔹 2. Authorization
      const isSelf = targetUserId === currentUser.userId;
      let isAuthorized = isSelf || isPromo; 

      if (!isAuthorized) {
        isAuthorized = await isUserInDownline(currentUser.userId, targetUserId);
      }

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to top up this user.' });
      }

      // 🔹 3. Package Validation & STEP-BY-STEP CHECK
      // 🔥 UPDATE: Added 10 to the packages array
      const allPackages = [10, 30, 60, 120, 240, 480, 960];
      
      if (!allPackages.includes(amount)) {
        return res.status(400).json({ message: "Invalid package amount." });
      }

      // 🌟 YAHAN DALNA THA YE CODE: Accurate bought packages check
      const boughtSet = new Set();
      if (targetUser.packages) {
        targetUser.packages.forEach(p => boughtSet.add(Number(p.amount)));
      }
      if (targetUser.purchasedPackages) {
        targetUser.purchasedPackages.forEach(p => boughtSet.add(Number(p)));
      }

      // Check if already purchased
      if (boughtSet.has(amount)) {
        return res.status(400).json({ message: `Package $${amount} already purchased.` });
      }

      // 🛑🛑 PROMO STOPPER 🛑🛑
      if (isPromo) {
        return res.json({
          success: true,
          message: `Top-up successful: Package $${amount} purchased. (Promo Demo)`, 
          funderUserId: currentUser.userId,
          targetUserId: targetUser.userId,
          funderBalance: currentUser.walletBalance, 
        });
      }

      // Step-by-Step Condition Check (Using the safe boughtSet)
      if (amount > 10) {
        const currentIndex = allPackages.indexOf(amount);
        const previousPackageAmount = allPackages[currentIndex - 1];
        
        if (!boughtSet.has(previousPackageAmount)) {
          return res.status(400).json({ 
            message: `Locked! You must purchase the $${previousPackageAmount} package before buying $${amount}.` 
          });
        }
      }

      // 🔹 4. Wallet Balance Check & Deduction
      if (currentUser.walletBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance in wallet' });
      }
      currentUser.walletBalance -= amount;
      await currentUser.save();

      // 🔹 5. Plan Calculation
      const packageToPlan = {
        10: "plan0", 30: "plan1", 60: "plan2", 120: "plan3",
        240: "plan4", 480: "plan5", 960: "plan6"
      };
      const assignedPlan = packageToPlan[amount] || "plan0";

      const createTransaction = async (data) => Transaction.create({ ...data, date: new Date() });

      // 🔹 6. Record Topup Transactions
      if (isSelf) {
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

      // Update TopUp Log
      if (typeof TopUp !== 'undefined') {
        await TopUp.create({
            funderUserId: currentUser.userId,
            targetUserId: targetUser.userId,
            amount,
            plan: assignedPlan,
            date: new Date(),
        });
      }

      // 🔹 7. Update Target User Profile
      targetUser.topUpAmount = Math.max(targetUser.topUpAmount || 0, amount);
      targetUser.topUpDate = new Date();
      targetUser.isToppedUp = true;

      // Update packages array
      if (!targetUser.packages) targetUser.packages = [];
      targetUser.packages.push({
        plan: assignedPlan,
        amount: amount,
        startDate: new Date(),
        withdrawn: 0
      });

      // Update purchasedPackages list (Ye important hai step-by-step ke liye)
      if (!targetUser.purchasedPackages) targetUser.purchasedPackages = [];
      targetUser.purchasedPackages.push(amount);

      await targetUser.save();

      // ==========================================
      // 🔹 7.5 🔥 DIRECT INCOME LOGIC (10%) 🔥
      // ==========================================
      if (targetUser.sponsorId) {
        const sponsor = await User.findOne({ userId: targetUser.sponsorId });
        if (sponsor) {
          const directIncomeAmount = amount * 0.10; // 10% calculate kiya
          
          // ✅ UPDATE: Main wallet me add nahi kar rahe hain.
          // sponsor.walletBalance += directIncomeAmount; <-- HATA DIYA
          
          // ✅ UPDATE: Seedha Direct Income ke khate me daal rahe hain
          sponsor.directIncome = (sponsor.directIncome || 0) + directIncomeAmount; 
          
          // Lifetime records ke liye total me bhi jod diya (taaki dashboard summary se kam na ho withdrawal ke baad)
          sponsor.totalDirectIncome = (sponsor.totalDirectIncome || 0) + directIncomeAmount;
          sponsor.totalIncome = (sponsor.totalIncome || 0) + directIncomeAmount; 
          
          await sponsor.save();

          await createTransaction({
            userId: sponsor.userId,
            type: "direct_income", // Transaction type
            source: "topup",
            amount: directIncomeAmount,
            fromUserId: targetUser.userId,
            toUserId: sponsor.userId,
            description: `10% Direct Income from ${targetUser.userId}'s $${amount} package top-up`,
          });
        }
      }

      // 🔹 8. 🔥 MANAGER USDT REWARD LOGIC 🔥
      if (amount >= 30 && targetUser.sponsorId) {
          setTimeout(async () => {
              try {
                  let sponsorId = targetUser.sponsorId;
                  let levelsChecked = 0;
                  while (sponsorId && levelsChecked < 15) {
                      const sponsor = await User.findOne({ userId: sponsorId });
                      if (!sponsor) break;
                      await checkAndAwardManagerReward(sponsor.userId);
                      sponsorId = sponsor.sponsorId; 
                      levelsChecked++;
                  }
              } catch (error) {
                  console.error("Manager Reward Error:", error);
              }
          }, 0);
      }

      // 🔹 9. DONE!
      res.json({
        success: true,
        message: `Top-up successful: Package $${amount} purchased.`,
        funderUserId: currentUser.userId,
        targetUserId: targetUser.userId,
        funderBalance: currentUser.walletBalance,
      });

    } catch (err) {
      console.error('Top-up Error:', err);
      res.status(500).json({ message: 'Server error during top-up' });
    }
  }
);

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





// 🔥 ADMIN ROUTE: Purane Missed Rewards Dilane Ke Liye (Bas Ek Baar Chalana Hai)
 


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

    // 🔥 FIX: If totalRewardIncome is 0 but they have claimed rewards, sync it up
    if (user.totalRewardIncome === 0 && user.rewardIncome > 0) {
        user.totalRewardIncome = user.rewardIncome;
        // Note: This only works perfectly if they haven't withdrawn yet. 
        // If they already withdrew, you might need to calculate it from their claimedRewards array.
    }

    res.json({ 
        success: true,
        user: user,
        income: {
            totalDirectIncome: user.totalDirectIncome || user.directIncome || 0,
            totalLevelIncome: user.levelIncome || 0,
            // Force it to be a string temporarily to bypass React's zero-skipping issue if needed, 
            // but returning the true total is best:
            totalRewardIncome: user.totalRewardIncome || user.rewardIncome || 0 
        }
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ---------------------------
// Update user
// Update user - REPLACE YOUR EXISTING router.put('/:userId' ...) WITH THIS:
router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    const { walletAddress, oldTxnPassword } = req.body;
    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 🔥 LOCK LOGIC: Check if any withdrawal is pending
    // Hum Withdrawal model me ja kar check karenge ki is user ki koi "pending" request hai ya nahi
    const Withdrawal = require('../models/Withdrawal'); // Model import ensure karein
    const pendingRequest = await Withdrawal.findOne({ userId: user.userId, status: 'pending' });

    if (walletAddress && walletAddress !== user.walletAddress) {
      if (pendingRequest) {
        return res.status(403).json({ 
          message: 'Wallet Locked: You cannot change address while a withdrawal is pending.' 
        });
      }

      // Baaki uniqueness check...
      const exists = await User.findOne({ walletAddress });
      if (exists) return res.status(403).json({ message: 'Address already in use.' });

      user.walletAddress = walletAddress;
    }

    // Baaki profile update logic...
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/check-wallet', async (req, res) => {
  const { walletAddress } = req.body;
  const exists = await User.findOne({ walletAddress });
  res.json({ exists: !!exists });
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
const matchTxn = (oldTxnPassword === user.transactionPassword);
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
 

// Ye aapki file ki sabse aakhiri line honi chahiye 👇
module.exports = router;