const Transaction = require("../../models/Transaction"); 
const User = require("../../models/User"); 

const reverseTransactions = async (req, res) => {
  try {
    const { txIds, reason } = req.body;

    if (!txIds || txIds.length === 0) {
      return res.status(400).json({ message: "No transactions selected to reverse." });
    }

    const reversedTxs = [];

    // Har ek selected transaction ko loop me check aur reverse karenge
    for (let id of txIds) {
      const tx = await Transaction.findById(id);

      // Agar transaction nahi mili ya pehle se reversed hai, toh skip karo
      if (!tx || tx.reversed) continue;

      // 🔴 STEP 1: Transaction ko Reversed mark karna
      tx.reversed = true;
      tx.reversedReason = reason || "Reversed by Admin";
      tx.reversedAt = new Date();
      await tx.save();

      // 🔥 SABSE BADA FIX: Amount ko yahan strictly NUMBER bana diya 
      // Taaki aage chalkar "40" + "20" = "4020" wala jhol na ho.
      const numAmount = Number(tx.amount) || 0;

      // 🔴 STEP 2: Main Logic - Transaction Type ke hisaab se Action lena
      
      // ============================================
      // 1️⃣ AGAR TOP-UP REVERSE HUA HAI
      // ============================================
      if (tx.type === "topup") {
        
        // Double Counting Fix: Agar description me "received" hai, skip karo.
        if (tx.description && tx.description.includes("received")) {
            reversedTxs.push(tx._id);
            continue; 
        }

        const targetUser = await User.findOne({ userId: tx.toUserId || tx.userId });
        const funderUser = await User.findOne({ userId: tx.fromUserId });

        const isFree10 = numAmount === 10 && tx.description && tx.description.includes("FREE");

        // --- A. Target User ka Package Delete Karna ---
        if (targetUser) {
          if (targetUser.packages && targetUser.packages.length > 0) {
            targetUser.packages = targetUser.packages.filter(
              (pkg) => Number(pkg.amount) !== numAmount
            );
          }

          if (targetUser.purchasedPackages && targetUser.purchasedPackages.length > 0) {
             targetUser.purchasedPackages = targetUser.purchasedPackages.filter(
                (pkgAmount) => Number(pkgAmount) !== numAmount
             );
          }

          let previousHighestPackage = 0;
          if (targetUser.packages && targetUser.packages.length > 0) {
             previousHighestPackage = Math.max(...targetUser.packages.map(p => Number(p.amount)));
          }

          targetUser.topUpAmount = previousHighestPackage;
          if (previousHighestPackage === 0) {
             targetUser.isActive = false; 
             targetUser.isToppedUp = false;
          }
          await targetUser.save();
        }

        // --- B. Funder User ko paise wapas dena ---
        if (funderUser && !isFree10) {
           // 🔥 String Judne se rokne ke liye dono taraf Number() ensure kiya
           funderUser.walletBalance = Number(funderUser.walletBalance || 0) + numAmount;
           await funderUser.save();
        }
      }

      // ============================================
      // 2️⃣ AGAR INCOME REVERSE HUI HAI (Direct/Level/Spin)
      // ============================================
      else if (["direct_income", "level_income", "spin_income"].includes(tx.type)) {
        const user = await User.findOne({ userId: tx.userId });
        if (user) {
           // Har jagah strictly Number() lagaya gaya hai
           user.totalIncome = Number(user.totalIncome || 0) - numAmount;

           if (tx.type === "direct_income") {
               user.directIncome = Number(user.directIncome || 0) - numAmount;
               user.totalDirectIncome = Number(user.totalDirectIncome || 0) - numAmount; 
           } else if (tx.type === "level_income") {
               user.levelIncome = Number(user.levelIncome || 0) - numAmount;
           } else if (tx.type === "spin_income") {
               user.spinIncome = Number(user.spinIncome || 0) - numAmount;
           }
           await user.save();
        }
      }

      // ============================================
      // 3️⃣ AGAR P2P TRANSFER REVERSE HUA HAI
      // ============================================
      else if (tx.type === "transfer") {
        const senderId = tx.fromUserId || tx.userId; 
        const receiverId = tx.toUserId;              

        if (senderId) {
          const sender = await User.findOne({ userId: senderId });
          if (sender) {
            // 🔥 YAHI THA 4020 WALA BUG! Ab ye strictly Number me plus hoga
            sender.walletBalance = Number(sender.walletBalance || 0) + numAmount;
            await sender.save();
          }
        }

        if (receiverId) {
          const receiver = await User.findOne({ userId: receiverId });
          if (receiver) {
            receiver.walletBalance = Number(receiver.walletBalance || 0) - numAmount;
            await receiver.save();
          }
        }
      }

      reversedTxs.push(tx._id);
    }

    return res.status(200).json({ 
      message: "Transactions reversed successfully", 
      reversedTxs 
    });

  } catch (error) {
    console.error("Reverse Transaction Error:", error);
    res.status(500).json({ message: "Server error while reversing transactions." });
  }
};

module.exports = { reverseTransactions };