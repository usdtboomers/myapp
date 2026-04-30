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
        `🚀 <b>Claim Your FREE $10 ID Today!</b> 🚀\n\n👉 <i>Just add 5 direct members</i>\n👉 <i>Follow the same duplication</i>\n👉 <i>Grow your team & unlock rewards</i>\n\n⚠️ <b>IMPORTANT:</b> <i>Your FREE $10 ID must be upgraded to $30 within 7 days of activation!</i>\n👉 <b>If not, it will be deactivated and you will have to pay $10 to reactivate it.</b>\n\n✅ <u>No conditions for withdrawal after upgrade</u>\n🔐 <b>100% secure crowdfunding platform</b>\n\n🔥 <b>Want to earn rewards faster?</b>\n👉 <i>Share your referral link</i>\n👉 <i>Invite as many direct members as possible!</i>`,
        
        `🚀 <b>$10 FREE ID – Limited Time Opportunity</b>\n\n👉 <i>Add 5 direct members</i>\n👉 <i>Follow duplication</i>\n👉 <i>Grow your team & unlock rewards</i>\n\n💡 <b>Action Required:</b> <i>Upgrade your ID with $30 within 7 days of activation to avoid deactivation.</i>\n⚠️ <i>(Reactivation will cost $10 later)</i>\n\n🔥 <u>Share your link & build your network now!</u>`,
        
        `🎁 <b>Start FREE with a $10 ID!</b>\n\n👉 <i>Complete 5 directs</i>\n👉 <i>Help your team duplicate</i>\n👉 <i>Build a strong network</i>\n\n💰 <b>Upgrade to $30 within 7 days to keep your ID active & enable withdrawals!</b>\n⚠️ <i>Failure to upgrade in 7 days will deactivate your ID ($10 reactivation fee).</i>\n\n🚀 <u>More sharing = More growth</u> 📈`,
        
        `🔥 <b>Massive Opportunity – $10 FREE ID</b>\n\n👉 <i>Just 5 directs needed</i>\n👉 <i>Same duplication system</i>\n👉 <i>Unlock all rewards</i>\n\n💡 <b>Must Upgrade:</b> <i>Top up with $30 within 7 days to secure your account and withdrawals.</i>\n❌ <i>Don't let it expire! (Deactivated IDs need $10 to unlock).</i>\n\n⏳ <u>Take action and grow your team today!</u>`
    ];

    let currentMsgIndex = 0;
    const isTesting = false;

    // 🔥 CRON PATTERN FIX: 'minute hour day month day-of-week' (5 Stars total)
    const schedules = {
        promo: isTesting ? '* * * * *' : '0 7 * * *',       // Subah 7:00 AM IST
        withdrawal: isTesting ? '* * * * *' : '1 0 * * *'  // 🔥 12:01 AM IST (Abhi ke liye)
    };

    // 1. Promo Message Task
  // Is line ko ab hata do (iska kaam khatam):
    // let currentMsgIndex = 0; 

    // 1. Promo Message Task
    cron.schedule(schedules.promo, async () => {
        try {
            // 🔥 NAYA LOGIC: Tareekh (Date) ke hisaab se index nikalna
            const indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const todayDate = new Date(indiaTime).getDate(); // Returns day of the month (1-31)
            
            // Tumhare array ki length 4 hai.
            // Example: Agar 22 date hai toh: 22 % 4 = 2 (3rd message jayega)
            // Agar 23 date hai toh: 23 % 4 = 3 (4th message jayega)
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

    console.log(`🤖 Telegram Bot Started! Next Message at 12:01 AM IST.`);
};

module.exports = startTelegramBot;