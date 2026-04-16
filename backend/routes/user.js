const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
 const TopUp = require('../models/TopUp'); 
 const DummyTransaction = require('../models/DummyTransaction');
const DummyUser = require('../models/DummyUser.js'); // 🔥 Naya model

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
// ---------------------------
// 1. UPDATED (SUPER FAST): Direct Team Route
// ---------------------------
router.get('/direct-team/:userId', async (req, res) => {
  try {
    const currentUserId = Number(req.params.userId);

    // 🔥 1. Ek hi Aggregation Query me Directs aur unki Total Team/Directs Count nikal lenge
    // Ye query 1 second se bhi kam me execute hogi
    const result = await User.aggregate([
      // Step A: Find the main user's directs
      { $match: { sponsorId: currentUserId } },
      
      // Step B: Har direct member ki poori downline nikalna (Team Size ke liye)
      {
        $graphLookup: {
          from: "users",
          startWith: "$userId",
          connectFromField: "userId",
          connectToField: "sponsorId",
          as: "fullDownline",
          maxDepth: 10 // Kitne level deep tak jana hai
        }
      },

      // Step C: Result ko format karna aur counts banana
      {
        $project: {
          _id: 1,
          userId: 1,
          name: 1,
          mobile: 1,
          country: 1,
          topUpAmount: 1,
          createdAt: 1,
          
          // Directs of this member
          totalDirects: {
            $size: {
              $filter: {
                input: "$fullDownline",
                as: "member",
                cond: { $eq: ["$$member.sponsorId", "$userId"] }
              }
            }
          },
          
          // Total Team Size of this member
          totalTeam: { $size: "$fullDownline" }
        }
      },
      // Optional: Naye log upar dikhane ke liye sort
      { $sort: { createdAt: -1 } }
    ]);

    // 🔥 2. Main User (Aapki) Total Team Count Nikalna
    const myTotalTeamResult = await User.aggregate([
      { $match: { userId: currentUserId } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$userId",
          connectFromField: "userId",
          connectToField: "sponsorId",
          as: "myDownline",
          maxDepth: 10
        }
      },
      { $project: { totalMyTeam: { $size: "$myDownline" } } }
    ]);

    const myTotalTeamCount = myTotalTeamResult.length > 0 ? myTotalTeamResult[0].totalMyTeam : 0;

    // Formatting for frontend
    const teamWithStats = result.map((member, i) => ({
      srNo: i + 1,
      ...member
    }));

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
// ---------------------------
// 2. All Team (HIGHLY OPTIMIZED WITH GRAPH LOOKUP)
// ---------------------------
router.get('/all-team/:userId', async (req, res) => {
  const userId = Number(req.params.userId);

  try {
    // MongoDB aggregation query for lightning-fast downline extraction
    const result = await User.aggregate([
      { $match: { userId: userId } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$userId",
          connectFromField: "userId",
          connectToField: "sponsorId",
          as: "downline",
           depthField: "level"
        }
      }
    ]);

    if (!result || result.length === 0 || !result[0].downline) {
      return res.json({
        team: [],
        totalTeamCount: 0,
        directCount: 0,
        indirectCount: 0,
        levelWiseCount: {}
      });
    }

    let allTeam = result[0].downline;

    const levelWiseCount = {};
    let directCount = 0;
    
    // Formatting data for frontend
    const formattedTeam = allTeam.map((u, i) => {
      const actualLevel = (u.level || 0) + 1; // graphLookup level 0 se start karta hai
      
      levelWiseCount[actualLevel] = (levelWiseCount[actualLevel] || 0) + 1;
      if (actualLevel === 1) directCount++;

      return {
        srNo: i + 1,
        _id: u._id,
        userId: u.userId,
        name: u.name,
        country: u.country,
        topUpAmount: u.topUpAmount || 0,
        createdAt: u.createdAt,
        level: actualLevel
      };
    });

    res.json({
      team: formattedTeam,
      totalTeamCount: formattedTeam.length,
      directCount: directCount,
      indirectCount: formattedTeam.length - directCount,
      levelWiseCount: levelWiseCount
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
 


// ✅ PROMO USER DEDICATED ROUTE

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
      // 🔥 NAYA: isPromoFree frontend se accept kar rahe hain
      const { amount, transactionPassword, isPromoFree } = req.body;

      // 🔹 1. User & Password Check
      const currentUser = await User.findOne({ userId: req.user.userId });
      if (!currentUser) return res.status(404).json({ message: "Current user not found" });

      if (!transactionPassword) {
        return res.status(400).json({ message: "Transaction password is required" });
      }
      
      const isValidPassword = (transactionPassword.toLowerCase() === currentUser.transactionPassword.toLowerCase());
      if (!isValidPassword) {
        return res.status(403).json({ message: "Invalid transaction password" });
      }

      if (!amount) return res.status(400).json({ message: 'Missing amount.' });

      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

      // 🔥 CHECK: Is this a Promo User?
      const isPromo = currentUser.role === 'promo';

      // 🔹 2. Authorization (YAHAN SE RESTRICTION HATA DIYA HAI)
      const isSelf = targetUserId === currentUser.userId;
      // Ab koi pabandi nahi hai, koi bhi kisi ko bhi top-up kar sakta hai.

      // 🔹 3. Package Validation & STEP-BY-STEP CHECK
      const allPackages = [10, 30, 60, 120, 240, 480, 960];
      
      if (!allPackages.includes(amount)) {
        return res.status(400).json({ message: "Invalid package amount." });
      }

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

      // Step-by-Step Condition Check
      if (amount > 10) {
        const currentIndex = allPackages.indexOf(amount);
        const previousPackageAmount = allPackages[currentIndex - 1];
        
        if (!boughtSet.has(previousPackageAmount)) {
          return res.status(400).json({ 
            message: `Locked! You must purchase the $${previousPackageAmount} package before buying $${amount}.` 
          });
        }
      }

      // =======================================================
      // 🔹 4. Wallet Balance Check & Deduction (MODIFIED FOR FREE $10)
      // =======================================================
      // Agar frontend ne isPromoFree=true bheja hai AUR amount sirf 10 hai, toh paise mat kaato
      if (!(isPromoFree && amount === 10)) {
        // Normal topup - Paisa kaato
        if (currentUser.walletBalance < amount) {
          return res.status(400).json({ message: 'Insufficient balance in wallet' });
        }
        currentUser.walletBalance -= amount;
        await currentUser.save();
      }

      // 🔹 5. Plan Calculation
      const packageToPlan = {
        10: "plan0", 30: "plan1", 60: "plan2", 120: "plan3",
        240: "plan4", 480: "plan5", 960: "plan6"
      };
      const assignedPlan = packageToPlan[amount] || "plan0";

      const createTransaction = async (data) => Transaction.create({ ...data, date: new Date() });

      // 🔹 6. Record Topup Transactions
      let txDescription = `Self top-up of $${amount}`;
      if (isPromoFree && amount === 10) {
          txDescription = `FREE Promo Activation of $10 Package`;
      }

      if (isSelf) {
        await createTransaction({
          userId: targetUser.userId,
          type: "topup",
          source: "topup",
          amount,
          fromUserId: currentUser.userId,
          toUserId: targetUser.userId,
          description: txDescription,
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

      // Update TopUp Log (Agar TopUp model hai toh)
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

      if (!targetUser.packages) targetUser.packages = [];
      targetUser.packages.push({
        plan: assignedPlan,
        amount: amount,
        startDate: new Date(),
        withdrawn: 0
      });

      if (!targetUser.purchasedPackages) targetUser.purchasedPackages = [];
      targetUser.purchasedPackages.push(amount);

      await targetUser.save();

      // ==========================================
      // 🔹 7.5 🔥 DIRECT INCOME LOGIC (10%) 🔥
      // ==========================================
      // ✅ NAYI CONDITION: Agar amount 10 hai, toh direct income MAT do.
      if (targetUser.sponsorId && amount !== 10) {
        const sponsor = await User.findOne({ userId: targetUser.sponsorId });
        if (sponsor) {
          const directIncomeAmount = amount * 0.10; 
          
          sponsor.directIncome = (sponsor.directIncome || 0) + directIncomeAmount; 
          sponsor.totalDirectIncome = (sponsor.totalDirectIncome || 0) + directIncomeAmount;
          sponsor.totalIncome = (sponsor.totalIncome || 0) + directIncomeAmount; 
          
          await sponsor.save();

          await createTransaction({
            userId: sponsor.userId,
            type: "direct_income", 
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
                    // Ye checkAndAwardManagerReward wala function bahar define hona chahiye
                    if (typeof checkAndAwardManagerReward === 'function') {
                       await checkAndAwardManagerReward(sponsor.userId);
                    }
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






// Backend Route: promo-dummy-topup
// ✅ PROMO DUMMY TOPUP - FIXED & ROBUST
// ✅ UPDATED BACKEND ROUTE (Using DummyTransaction Model)
router.post('/promo-dummy-topup', authMiddleware, async (req, res) => {
  try {
    const { amount, transactionPassword } = req.body;
    const currentUser = await User.findOne({ userId: req.user.userId });

    // 1. Password Check
    if (!transactionPassword || transactionPassword.toLowerCase() !== currentUser.transactionPassword.toLowerCase()) {
      return res.status(403).json({ message: "Invalid transaction password" });
    }

    // 🔥 RANDOM NAME LOGIC: Yahan humne list bana di hai
  const firstNames = [
      "Aarav", "Abhay", "Abhinav", "Aditya", "Adarsh", "Akash", "Akhil", "Alok", "Aman", "Amar", "Amit", "Amol", "Anand", "Aniket", "Anirudh", "Ankit", "Ankur", "Anmol", "Ansh", "Anshul", "Anuj", "Anupam", "Apoorv", "Arjun", "Arnav", "Aryan", "Ashish", "Ashok", "Ashutosh", "Atul", "Ayush",
      "Balram", "Bharat", "Bhaskar", "Bhavish", "Bhupendra", "Brijesh", "Chaitanya", "Chandan", "Chetan", "Chirag", "Daksh", "Darpan", "Deepak", "Dev", "Devendra", "Dharmendra", "Dheeraj", "Dhruv", "Digvijay", "Dilip", "Dinesh", "Divyansh", "Gajendra", "Ganesh", "Gaurav", "Gautam", "Girish", "Gopal", "Gulshan", "Gunjit",
      "Harish", "Harsh", "Harshit", "Hemant", "Himanshu", "Hitesh", "Inder", "Ishaan", "Ishwar", "Jagdish", "Jaideep", "Jatin", "Jitendra", "Jugal", "Kabir", "Kailash", "Kamal", "Kapil", "Karan", "Kartik", "Kaushal", "Ketan", "Kiran", "Kishore", "Krishan", "Krunal", "Kuldeep", "Kunal", "Kushagra", "Laksh", "Lalit", "Lokesh",
      "Madhav", "Mahendra", "Mahesh", "Manas", "Manish", "Manit", "Manoj", "Mayank", "Milind", "Mohit", "Mukesh", "Mukul", "Nakul", "Naman", "Narendra", "Naresh", "Navneet", "Neeraj", "Nikhil", "Nilesh", "Nishant", "Nitin", "Om", "Omprakash", "Pankaj", "Parth", "Pawan", "Pradeep", "Prafull", "Pranjal", "Prateek", "Pratosh", "Praveen", "Prayas", "Puneet", "Pushkar",
      "Raghav", "Rahul", "Rajat", "Rajeev", "Rajesh", "Rajnish", "Rakesh", "Ram", "Ramesh", "Ranveer", "Ratan", "Ravi", "Ravindra", "Rishi", "Ritesh", "Rohan", "Rohit", "Ronak", "Rupesh", "Sachin", "Sagar", "Sahil", "Sajid", "Sameer", "Sandeep", "Sanjay", "Sanjeev", "Santosh", "Sarthak", "Satish", "Saurabh", "Shakti", "Shantanu", "Sharad", "Shashank", "Shikhar", "Shivam", "Shravan", "Shreyas", "Shubham", "Siddharth", "Somesh", "Subhash", "Sudhanshu", "Sudhir", "Sujit", "Sumit", "Sunil", "Suraj", "Suresh", "Surya", "Sushant", "Swapnil",
      "Tanmay", "Tarun", "Tejas", "Trilok", "Tushar", "Uday", "Udit", "Ujjwal", "Umang", "Utkarsh", "Vaibhav", "Varun", "Vicky", "Vidit", "Vijay", "Vikram", "Vimal", "Vinay", "Vineet", "Vinod", "Vipin", "Viplav", "Viraaj", "Vishal", "Vishnu", "Vishwa", "Vivek", "Vyom", "Yash", "Yogesh", "Yuvraj"
    ];

    // 🚀 MEGA LIST: 100+ Indian Last Names
    const lastNames = [
      "Agarwal", "Ahluwalia", "Arora", "Babu", "Bajpai", "Bakshi", "Banerjee", "Bansal", "Bhardwaj", "Bhatia", "Bhatt", "Biswas", "Bose", "Chahal", "Chakraborty", "Chatterjee", "Chauhan", "Chhabra", "Choudhary", "Chopra", "Das", "Dayal", "Deshmukh", "Devi", "Dhillon", "Dixit", "Dubey", "Dutta", "Dwivedi", "Gadhavi", "Gandhi", "Garg", "Gautam", "Gill", "Goel", "Gokhale", "Goswami", "Gowda", "Gupta", "Iyer", "Jadeja", "Jain", "Jha", "Joshi", "Kapoor", "Kashyap", "Kaur", "Khanna", "Khatri", "Kulkarni", "Kumar", "Luthra", "Mahajan", "Malhotra", "Malik", "Maurya", "Mehra", "Mehta", "Menon", "Mishra", "Mittal", "Modi", "Mukherjee", "Nair", "Ojha", "Pandey", "Pant", "Parekh", "Paswan", "Patel", "Patil", "Pillai", "Prasad", "Puri", "Rai", "Rajput", "Rao", "Rastogi", "Rathore", "Rawat", "Reddy", "Sahni", "Saini", "Saksena", "Sarkar", "Saxena", "Sen", "Sethi", "Shah", "Sharma", "Shekhawat", "Shetty", "Shinde", "Shukla", "Singh", "Singhal", "Sinha", "Somani", "Soni", "Srivastava", "Talwar", "Taneja", "Thakur", "Tiwari", "Tripathi", "Trivedi", "Tyagi", "Upadhyay", "Varma", "Vashisht", "Verma", "Vyas", "Yadav"
    ];
    // Randomly pick karne ka tarika
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${randomFirstName} ${randomLastName}`;

    // 2. Unique ID Generation
    let dummyId;
    let isUnique = false;
    while (!isUnique) {
      dummyId = Math.floor(1000000 + Math.random() * 9000000);
      const existsInReal = await User.findOne({ userId: dummyId });
      const existsInDummy = await DummyUser.findOne({ userId: dummyId });
      if (!existsInReal && !existsInDummy) isUnique = true;
    }

    // 3. Save in DUMMY USER table
    const newDummy = new DummyUser({
      userId: dummyId,
      name: fullName, // 🔥 Ab yahan dynamic random naam jayega
      email: `demo_${dummyId}@usdtboomers.com`,
      password: "demo_password_123",
      country: "India",
      // 🔥 Mobile bhi random kar diya hai taaki real lage
      mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`, 
      topUpAmount: Number(amount),
      sponsorId: currentUser.userId
    });
    await newDummy.save();

    // 4. Record in Dummy Transaction
    await DummyTransaction.create({
      userId: currentUser.userId,
      generatedId: dummyId,
      amount: Number(amount),
      description: `Demo top-up generated for ID ${dummyId}`
    });

    res.json({ success: true, generatedId: dummyId, name: fullName });

  } catch (err) {
    res.status(500).json({ message: "Error: " + err.message });
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
// 🚀 UPDATED (SUPER FAST): Downline Business Route
router.get("/downline-business/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // 1. Find main user
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Sirf 1 DB call mein saari downline team nikal lo (GraphLookup)
    const teamResult = await User.aggregate([
      { $match: { userId: userId } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$userId",
          connectFromField: "userId",
          connectToField: "sponsorId",
          as: "downline",
          maxDepth: 15, // 15 level deep tak ki team fetch karega
          depthField: "level"
        }
      }
    ]);

    // Agar downline nahi hai, toh empty data bhej do
    if (!teamResult || teamResult.length === 0 || !teamResult[0].downline) {
      return res.json({
        totalTopup: 0,
        totalWithdrawal: 0,
        totalBusiness: 0,
        totalTeamCount: 0,
        directCount: 0,
        indirectCount: 0,
        team: []
      });
    }

    const rawTeam = teamResult[0].downline;
    // Saare downline users ki ID ek array mein nikal lo
    const downlineUserIds = rawTeam.map(u => u.userId);

    // 3. Poori team ki transactions sirf 1 DB call mein nikal lo (Yahan loop khatam ho gaya!)
    const allTransactions = await Transaction.find({
      userId: { $in: downlineUserIds },
      type: { $in: ["topup", "withdrawal"] }
    }).lean().sort({ date: -1 });

    // 4. Transactions ko fast processing ke liye Map (Dictionary) mein daal lo
    const txMap = {};
    allTransactions.forEach(t => {
      if (!txMap[t.userId]) txMap[t.userId] = [];
      
      // Amount format fix
      let amt = t.amount;
      if (amt && typeof amt === "object") {
        amt = parseFloat(amt.toString());
      } else {
        amt = Number(amt || 0);
      }

      txMap[t.userId].push({
        type: t.type,
        amount: amt,
        date: t.date
      });
    });

    // 5. Final Calculations
    let totalSystemTopup = 0;
    let totalSystemWithdrawal = 0;
    let totalSystemBusiness = 0;
    let directCount = 0;
    let indirectCount = 0;

    const formattedTeam = rawTeam.map((u, idx) => {
      const actualLevel = (u.level || 0) + 1; // GraphLookup 0 se start karta hai
      
      if (actualLevel === 1) directCount++;
      else indirectCount++;

      const userTxs = txMap[u.userId] || [];
      
      let totalTopup = 0;
      let totalWithdrawal = 0;
      let totalBusiness = 0;

      userTxs.forEach(t => {
        if (t.type === "topup") totalTopup += t.amount;
        if (t.type === "withdrawal") totalWithdrawal += t.amount;
        totalBusiness += t.amount;
      });

      totalSystemTopup += totalTopup;
      totalSystemWithdrawal += totalWithdrawal;
      totalSystemBusiness += totalBusiness;

      return {
        userId: u.userId,
        name: u.name || "N/A",
        level: actualLevel,
        totalTopup,
        totalWithdrawal,
        totalBusiness,
        transactions: userTxs
      };
    });

    // Level ke hisaab se sort karo (Directs pehle aayenge)
    formattedTeam.sort((a, b) => a.level - b.level);

    // Frontend ke hisaab se srNo add karo
    const finalTeam = formattedTeam.map((u, idx) => ({
      srNo: idx + 1,
      ...u
    }));

    // 6. Return response
    res.json({
      totalTopup: totalSystemTopup,
      totalWithdrawal: totalSystemWithdrawal,
      totalBusiness: totalSystemBusiness,
      totalTeamCount: finalTeam.length,
      directCount,
      indirectCount,
      team: finalTeam
    });

  } catch (err) {
    console.error("Error fetching downline business:", err);
    res.status(500).json({ message: "Server error" });
  }
});




// 🔥 ADMIN ROUTE: Purane Missed Rewards Dilane Ke Liye (Bas Ek Baar Chalana Hai)
 


// routes/user.js
// ✅ UPDATED: Sponsor Name Fetch (Dono tables check karega)
router.get('/sponsor-name/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    // 1. Pehle 'User' (Real) collection mein dhoondo
    // Sirf 'name' select kar rahe hain taaki query fast ho
    let sponsor = await User.findOne({ userId: id }).select('name');

    // 2. 🔥 Agar Real mein nahi mila, toh 'DummyUser' table mein check karo
    if (!sponsor) {
      // Ensure karna ki DummyUser model upar require kiya hua hai
      if (typeof DummyUser !== 'undefined') {
        sponsor = await DummyUser.findOne({ userId: id }).select('name');
      }
    }

    // 3. Agar dono jagah nahi mila toh 404
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    // 4. Sirf naam bhej do (Frontend isi ka intezaar kar raha hai)
    res.json({ name: sponsor.name });

  } catch (err) {
    console.error("Sponsor Name Fetch Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});



// ==========================================
// ✅ GET REWARD PROGRESS STATS API
// ==========================================
// ==========================================
// ✅ FAST: GET REWARD PROGRESS STATS API
// ==========================================
router.get('/reward-stats/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findOne({ userId });
    
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔥 FASTER WAY: Ek single database call se saari team nikal lo
    const result = await User.aggregate([
      { $match: { userId: userId } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$userId",
          connectFromField: "userId",
          connectToField: "sponsorId",
          as: "fullTeam",
          maxDepth: 15,
          depthField: "level" // direct = level 0, indirect = level 1+
        }
      }
    ]);

    let teamSize30 = 0;
    let teamSize60 = 0;
    let teamSize120 = 0;
    let directs = [];

    // Memory (RAM) mein fast counting
    if (result.length > 0 && result[0].fullTeam) {
       const fullTeam = result[0].fullTeam;
       
       for (const member of fullTeam) {
           // Level 0 ka matlab Direct Member hai
           if (member.level === 0) {
               directs.push(member);
           } 
           // Level > 0 ka matlab Downline Team (indirects) hai
           else {
               const amt = member.topUpAmount || 0;
               if (amt >= 30) teamSize30++;
               if (amt >= 60) teamSize60++;
               if (amt >= 120) teamSize120++;
           }
       }
    }

    res.json({
      success: true,
      ownTopUpAmount: user.topUpAmount || 0,
      currentRanks: {
        managerRank: user.managerRank || 0,
        seniorManagerRank: user.seniorManagerRank || 0,
        executiveManagerRank: user.executiveManagerRank || 0
      },
      teamSizes: {
        30: teamSize30,
        60: teamSize60,
        120: teamSize120
      },
      directs: directs.map(d => ({
        topUpAmount: d.topUpAmount || 0,
        managerRank: d.managerRank || 0,
        seniorManagerRank: d.seniorManagerRank || 0,
        executiveManagerRank: d.executiveManagerRank || 0
      }))
    });

  } catch (err) {
    console.error("Reward Stats Error:", err);
    res.status(500).json({ message: "Server error fetching reward stats" });
  }
});
 
// ---------------------------
 

 


// ✅ UPDATED GET ROUTE: Supports both Real and Dummy Users
router.get('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    
    // 1. Pehle 'User' (Real) collection mein dhoondo
    let user = await User.findOne({ userId }).select('-password -transactionPassword -txnPassword -__v');

    // 2. 🔥 Agar Real mein nahi mila, toh 'DummyUser' table mein check karo
    if (!user) {
        // 'DummyUser' model ko file ke top par import zaroori hai
        if (typeof DummyUser !== 'undefined') {
            user = await DummyUser.findOne({ userId }).select('-password -transactionPassword -txnPassword -__v');
        }
    }

    // 3. Agar dono jagah nahi mila toh Error
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // 4. 🔥 REWARD SYNC LOGIC (Dummy ya Real dono ke liye check karega)
    if (user.totalRewardIncome === 0 && user.rewardIncome > 0) {
        user.totalRewardIncome = user.rewardIncome;
    }

    // 5. Final Uniform Response (Frontend ko farq nahi dikhega)
    res.json({ 
        success: true,
        user: user, 
        income: {
            totalDirectIncome: user.totalDirectIncome || user.directIncome || 0,
            totalLevelIncome: user.levelIncome || 0,
            totalRewardIncome: user.totalRewardIncome || user.rewardIncome || 0,
            totalIncome: user.totalIncome || 0 
        }
    });

  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ 
        success: false, 
        message: 'Server error' 
    });
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