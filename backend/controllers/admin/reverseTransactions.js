const mongoose = require("mongoose");
const User = require("../../models/User");
const Transaction = require("../../models/Transaction");

const incomeFields = {
  direct_income: "directIncome",
  level_income: "levelIncome",
  plan_income: "planIncome",
  spin_income: "spinIncome",
 };

exports.reverseTransactions = async (req, res) => {
  try {
    const { txIds, reason } = req.body;

    if (!txIds || !Array.isArray(txIds) || txIds.length === 0) {
      return res.status(400).json({ message: "No transactions provided" });
    }

    const transactions = await Transaction.find({ _id: { $in: txIds } });
    if (!transactions.length) {
      return res.status(404).json({ message: "No matching transactions found" });
    }

    const reversedTxIds = [];

    for (const tx of transactions) {
      if (tx.reversed) continue;

      const receiver = await User.findOne({ userId: tx.userId });
      if (!receiver) continue;

      // -------------------- TOPUP / DEBIT_TOPUP / CREDIT_TOPUP --------------------
      if (["topup", "debit_topup", "credit_topup"].includes(tx.type)) {
        // Reset topup flags for receiver
        receiver.topUpAmount = 0;
        receiver.topUpDate = null;
        receiver.isToppedUp = false;
        receiver.dailyROI = [];
        receiver.lifetimeBonusROI = [];
         receiver.hasReceivedTopupBonus = false;
        await receiver.save();

        if (tx.type === "topup" && tx.fromUserId) {
          // Refund sender for a normal topup
          const sender = await User.findOne({ userId: tx.fromUserId });
          if (sender) {
            sender.walletBalance = (Number(sender.walletBalance) || 0) + Number(tx.amount);
            await sender.save();

            const refundTx = new Transaction({
              userId: sender.userId,
              type: "refund",
              amount: tx.amount,
              description: `Refund for reversed topup (original topup to ${receiver.userId})`,
              relatedTo: tx._id,
              createdAt: new Date(),
            });
            await refundTx.save();
            reversedTxIds.push(refundTx._id);
          }
        } else if (tx.type === "debit_topup") {
          // Refund the user who was debited instead of deducting
          receiver.walletBalance = (Number(receiver.walletBalance) || 0) + Number(tx.amount);
          await receiver.save();
        } else if (tx.type === "credit_topup") {
          // Deduct credited amount
          receiver.walletBalance = (Number(receiver.walletBalance) || 0) - Number(tx.amount);
          await receiver.save();
        }

        // Reverse related income transactions
        const relatedTxs = await Transaction.find({ relatedTo: tx._id, reversed: false });
        for (const rtx of relatedTxs) {
          if (tx.fromUserId && rtx.userId === tx.fromUserId) continue; // skip sender

          const rUser = await User.findOne({ userId: rtx.userId });
          if (!rUser) continue;

          const field = incomeFields[rtx.type];
          if (field) rUser[field] = (Number(rUser[field]) || 0) - Number(rtx.amount);

         

          rtx.reversed = true;
          rtx.reversalReason = reason || "Admin reversal";
          rtx.reversedAt = new Date();

          await rUser.save();
          await rtx.save();
          reversedTxIds.push(rtx._id);
        }
      } else {
        // -------------------- OTHER TRANSACTIONS --------------------
        switch (tx.type) {
          case "deposit":
          case "credit_to_wallet":
            receiver.walletBalance = (Number(receiver.walletBalance) || 0) - Number(tx.amount);
            break;

          case "withdrawal":
            receiver.walletBalance = (Number(receiver.walletBalance) || 0) + Number(tx.amount);
            break;

          case "transfer":
            if (tx.fromUserId) {
              const fromUser = await User.findOne({ userId: tx.fromUserId });
              if (fromUser) {
                fromUser.walletBalance = (Number(fromUser.walletBalance) || 0) + Number(tx.amount);
                await fromUser.save();
              }
            }
            if (tx.toUserId) {
              const toUser = await User.findOne({ userId: tx.toUserId });
              if (toUser) {
                toUser.walletBalance = (Number(toUser.walletBalance) || 0) - Number(tx.amount);
                await toUser.save();
              }
            }
            break;

          default:
            if (incomeFields[tx.type]) {
              const field = incomeFields[tx.type];
              receiver[field] = (Number(receiver[field]) || 0) - Number(tx.amount);
              receiver.walletBalance = (Number(receiver.walletBalance) || 0) - Number(tx.amount);
            } else {
              receiver.walletBalance = (Number(receiver.walletBalance) || 0) - Number(tx.amount);
            }
        }
        await receiver.save();
      }

      // -------------------- MARK MAIN TX AS REVERSED --------------------
      tx.reversed = true;
      tx.reversalReason = reason || "Admin reversal";
      tx.reversedAt = new Date();
      await tx.save();
      reversedTxIds.push(tx._id);
    }

    return res.json({
      success: true,
      message: `${reversedTxIds.length} transaction(s) reversed successfully`,
      reversedTxs: reversedTxIds,
    });
  } catch (err) {
    console.error("Reverse Transactions Error:", err);
    return res.status(500).json({ success: false, message: "Server error during reversal" });
  }
};
