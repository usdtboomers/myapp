const mongoose = require("mongoose");
const cron = require("node-cron");
const User = require("./models/User");
const Transaction = require("./models/Transaction");
require("dotenv").config();

// ---------------------------
// Migrate old numeric planIncome → object
// ---------------------------
async function migratePlanIncome() {
  const users = await User.find();
  for (const user of users) {
    if (typeof user.planIncome === "number") {
      console.log(`Migrating user ${user.userId} planIncome from number to object...`);
      user.planIncome = {
        plan1: user.planIncome,
        plan2: 0,
        plan3: 0,
        plan4: 0,
        plan5: 0,
        plan6: 0,
        plan7: 0,
      };
      await user.save();
    }
  }
  console.log("✅ Migration completed.");
}

// ---------------------------
// Daily Plan Income (multi-plan only)
// ---------------------------
async function runDailyPlanIncome() {
  console.log("⏰ Running Daily Plan Income...");

  const users = await User.find({ "dailyROI.0": { $exists: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const user of users) {
    let updated = false;

    // Ensure planIncome is object
    if (typeof user.planIncome !== "object" || user.planIncome === null) {
      user.planIncome = { plan1: 0, plan2: 0, plan3: 0, plan4: 0,plan5: 0,plan6: 0,plan7: 0};
    }

    // Fix old dailyROI missing plan
    user.dailyROI.forEach(roi => {
      if (!roi.plan) {
        roi.plan = "plan1"; // default plan
        updated = true;
      }
    });

    for (const roi of user.dailyROI) {
      if (roi.claimedDays >= roi.maxDays) continue;

      const lastDate = roi.lastCreditedDate ? new Date(roi.lastCreditedDate) : new Date(roi.startDate);
      lastDate.setHours(0, 0, 0, 0);

      const daysToCredit = Math.min(
        roi.maxDays - roi.claimedDays,
        Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
      );
      if (daysToCredit <= 0) continue;

      const dailyAmount = roi.amount;
      const plan = roi.plan || "plan1"; // fallback

      for (let i = 1; i <= daysToCredit; i++) {
        const creditDate = new Date(lastDate);
        creditDate.setDate(creditDate.getDate() + i);
        creditDate.setHours(0, 0, 0, 0);

        const alreadyCredited = await Transaction.exists({
          userId: user.userId,
          type: "plan_income",
          plan,
          date: { $gte: creditDate, $lt: new Date(creditDate.getTime() + 24 * 60 * 60 * 1000) },
        });
        if (alreadyCredited) continue;

        // Update ROI
        roi.totalEarned = (roi.totalEarned || 0) + dailyAmount;
        roi.claimedDays = (roi.claimedDays || 0) + 1;
        roi.lastCreditedDate = creditDate;

        roi.dailyDetails = roi.dailyDetails || [];
        roi.dailyDetails.push({
          day: roi.claimedDays,
          amount: dailyAmount,
          status: "claimed",
          date: creditDate,
        });

        // Update planIncome safely
        user.planIncome[plan] = (user.planIncome[plan] || 0) + dailyAmount;

        await Transaction.create({
          userId: user.userId,
          type: "plan_income",
          plan,
          source: "plan",
          amount: dailyAmount,
          description: `Daily ROI Day ${roi.claimedDays} for ${plan} ($${roi.amount})`,
          date: creditDate,
        });

        console.log(`✅ Credited $${dailyAmount.toFixed(2)} to user ${user.userId} for ${plan} on ${creditDate.toDateString()}`);
      }

      updated = true;
    }

    if (updated) await user.save();
  }

  console.log("✅ Daily Plan Income completed.");
}

// ---------------------------
// Mongo Connection + Scheduler
// ---------------------------
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Run migration once
    await migratePlanIncome();

    // Run daily ROI immediately
    await runDailyPlanIncome();

    // Schedule daily ROI at 00:01 AM
    cron.schedule("1 0 * * *", runDailyPlanIncome);
    console.log("⏰ Cron job scheduled for daily execution at 00:01 AM");
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

module.exports = { runDailyPlanIncome };
