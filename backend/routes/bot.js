const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const startTelegramBot = () => {
    // .env se credentials uthana
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME;

    if (!token || !channelUsername) {
        console.log("⚠️ Telegram Bot credentials missing in .env");
        return;
    }

    // Bot initialize karna
    const bot = new TelegramBot(token, { polling: false });

    // Messages Array
    const promoMessages = [
        `🚀 <b>Claim Your FREE $10 ID Today!</b> 🚀\n\n👉 <i>Register & start building your team effortlessly!</i>\n👉 <i>Grow your network & earn rewards</i>\n\n💡 <b>IMPORTANT:</b> <i>Top up with a $30 package whenever you are ready to unlock and withdraw your Global Growth Earnings!</i>\n\n👉 <i>Start Now & Claim Your Bonus!</i>`,

        `🎁 <b>Exclusive Offer: FREE $10 ID!</b> 🎁\n\n👉 <i>Start your journey with a 100% FREE $10 Package</i>\n👉 <i>Share your link and build a strong network</i>\n💎 <b>Unlock Income:</b> <i>Upgrade to $30 anytime to enable Global Growth Earning unlimited withdrawals!</i>\n\n⏳ <u>Don't wait, take action and grow your team today!</u>`,

        `🔥 <b>Massive Opportunity – Start FREE, Earn BIG!</b> 🔥\n\n👉 <i>Get your $10 ID absolutely FREE!</i>\n👉 <i>No conditions to build your team – just share & grow</i>\n✅ <i>Top up with $30 when you're ready to withdraw your Global Growth Income.</i>\n\n👉 <u>Start Now & Claim Your Position!</u>`
    ];

    const isTesting = false;

    // 🔥 CRON PATTERN FIX: 'minute hour day month day-of-week' (5 Stars total)
    const schedules = {
        promo: isTesting ? '* * * * *' : '0 7 * * *',       // Subah 7:00 AM IST
        withdrawal: isTesting ? '* * * * *' : '1 0 * * *',  // Raat 12:01 AM IST
        warning: isTesting ? '* * * * *' : '0 */4 * * *'    // 🔥 NAYA: Har 4 Ghante me (Every 4 Hours)
    };

    // 1. Promo Message Task
    cron.schedule(schedules.promo, async () => {
        try {
            // 🔥 NAYA LOGIC: Tareekh (Date) ke hisaab se index nikalna
            const indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const todayDate = new Date(indiaTime).getDate(); // Returns day of the month (1-31)
            
            const calculatedIndex = todayDate % promoMessages.length; 

            const msgToSend = promoMessages[calculatedIndex];
            
            await bot.sendMessage(channelUsername, msgToSend, { parse_mode: 'HTML' });
            
            console.log(`✅ Promo message (Index ${calculatedIndex}) sent successfully for Date: ${todayDate}`);
        } catch (error) {
            console.error("❌ Error promo message:", error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // 2. Withdrawal Update Task
    cron.schedule(schedules.withdrawal, async () => {
        try {
            // India ki current date se 1 din peeche jana
            const indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const yesterday = new Date(indiaTime);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const dateString = yesterday.toLocaleDateString('en-GB').replace(/\//g, '-');

            const withdrawalMsg = `💰 <b><u>Today Withdrawal Update</u></b>\n🗓️ <b>Date:</b> <code>${dateString}</code>\n\n🟢 <i>All withdrawals are being processed successfully</i> ✅\n\n🚀 <b>Stay active & keep growing!</b>`;
            
            await bot.sendMessage(channelUsername, withdrawalMsg, { parse_mode: 'HTML' });
            console.log(`✅ Withdrawal update for [${dateString}] sent successfully.`);
        } catch (error) {
            console.error("❌ Error withdrawal message:", error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // 3. 🔥 NAYA TASK: ID Deactivation Warning (Har 4 Ghante)
    cron.schedule(schedules.warning, async () => {
        try {
            const warningMsg = `⚠️ <b>URGENT NOTICE FOR FREE $10 IDs</b> ⚠️\n\n🚨 <b>ATTENTION:</b> All users with a FREE $10 ID must upgrade their accounts!\n\n👉 You are required to top-up with the <b>$30 Package</b> within 7 days of your ID creation.\n\n❌ <i>If you fail to upgrade in time, your $10 ID will be permanently <b>DEACTIVATED</b>!</i>\n\n✅ <b>Action Required:</b> Upgrade immediately to unlock your withdrawals and secure your team network!`;
            
            await bot.sendMessage(channelUsername, warningMsg, { parse_mode: 'HTML' });
            console.log(`✅ Deactivation warning message sent successfully (Runs every 4 hours).`);
        } catch (error) {
            console.error("❌ Error warning message:", error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log(`🤖 Telegram Bot Started! Promo at 7 AM, Withdrawal at 12:01 AM, Warning every 4 hours.`);
};

module.exports = startTelegramBot;