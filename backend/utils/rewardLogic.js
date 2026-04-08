const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ✅ MANAGER REWARD CONDITIONS
const MANAGER_CRITERIA = {
  1: { reqDirectRank: 0, reqDirectCount: 5, reqTeamSize: 10, reward: 100 },
  2: { reqDirectRank: 1, reqDirectCount: 2, reqTeamSize: 30, reward: 300 },
  3: { reqDirectRank: 1, reqDirectCount: 5, reqTeamSize: 150, reward: 500 },
  4: { reqDirectRank: 2, reqDirectCount: 2, reqTeamSize: 250, reward: 1000 },
  5: { reqDirectRank: 2, reqDirectCount: 5, reqTeamSize: 1000, reward: 2000 },
  6: { reqDirectRank: 3, reqDirectCount: 2, reqTeamSize: 3000, reward: 5000 },
  7: { reqDirectRank: 3, reqDirectCount: 5, reqTeamSize: 5000, reward: 10000 },
  8: { reqDirectRank: 4, reqDirectCount: 2, reqTeamSize: 10000, reward: 50000 },
  9: { reqDirectRank: 4, reqDirectCount: 5, reqTeamSize: 25000, reward: 100000 },
};

// 🔹 HELPER: Count Total Downline with $60+ Package
const calculate60TeamSize = async (sponsorId) => {
  let totalCount = 0;
  let queue = [sponsorId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const directs = await User.find({ sponsorId: currentId }, { userId: 1, topUpAmount: 1 });
    
    for (let direct of directs) {
      if (direct.topUpAmount >= 60) {
        totalCount++;
      }
      queue.push(direct.userId); // Aage ki team check karne ke liye queue me daalo
    }
  }
  return totalCount;
};

// 🔹 MAIN FUNCTION: Check and Award
const checkAndAwardManagerReward = async (userId) => {
  try {
    const user = await User.findOne({ userId });
    if (!user) return;

    // Check all ranks from 1 to 9
    for (let rank = 1; rank <= 9; rank++) {
      // Agar ye reward pehle le chuka hai, toh aage badho
      if (user.claimedRewards.includes(rank)) continue;

      const criteria = MANAGER_CRITERIA[rank];
      
      // 1. Directs aur Unki Rank nikalo
      const directs = await User.find({ sponsorId: user.userId, topUpAmount: { $gte: 60 } });
      
      // Directs jinki rank required rank ke barabar ya usse zyada hai
      const validDirectsCount = directs.filter(d => (d.managerRank || 0) >= criteria.reqDirectRank).length;

      // 2. Total 60 Wala Team Size Nikalo
      const total60Team = await calculate60TeamSize(user.userId);

      // ✅ Agar dono condition pass ho gayi (Directs + Team Size)
      if (validDirectsCount >= criteria.reqDirectCount && total60Team >= criteria.reqTeamSize) {
        
        // Paisa Reward Income me daalo
        user.rewardIncome = (user.rewardIncome || 0) + criteria.reward;
        user.managerRank = rank; // Rank update karo
        user.claimedRewards.push(rank); // Mark as claimed

        await user.save();

        // Transaction history banalo
        await Transaction.create({
          userId: user.userId,
          type: "reward_income",
          source: `manager_level_${rank}`,
          amount: criteria.reward,
          description: `Congratulations! You achieved Manager Level ${rank} and earned $${criteria.reward} USDT Reward.`,
          createdAt: new Date(),
        });

        console.log(`✅ User ${user.userId} promoted to Manager ${rank} and rewarded $${criteria.reward}`);
      } else {
        // Agar ek level fail ho gaya, toh aage ke level check karne ka fayda nahi
        break; 
      }
    }
  } catch (err) {
    console.error("Error in reward calculation:", err);
  }
};

module.exports = { checkAndAwardManagerReward };