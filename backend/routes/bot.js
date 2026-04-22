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
        `🚀 <b>$10 FREE ID available till 30 April (Pre-Launching Offer)</b> 🚀\n\n👉 <i>Just add 5 direct members</i>\n👉 <i>Follow the same duplication</i>\n👉 <i>Grow your team</i>\n👉 <i>Unlock rewards</i>\n\n💡 <b>Note:</b> <i>Rewards withdrawal will be enabled after upgrading to $30</i>\n👉 <b>Upgrade your ID to $30 to withdraw rewards</b>\n\n\n✅ <u>No conditions for withdrawal</u>\n🔐 <b>100% secure crowdfunding platform</b>\n\n\n🔥 <b>Want to earn rewards faster?</b>\n👉 <i>Share your referral link</i>\n👉 <i>Invite as many direct members as possible</i>\n\n⏳ <b>Pre-launching offer valid till 30 April</b>`,
        `🚀 <b>$10 FREE ID – Limited Time Offer</b> <i>(Till 30 April)</i>\n\n👉 <i>Add 5 direct members</i>\n👉 <i>Follow duplication</i>\n👉 <i>Grow your team & unlock rewards</i>\n\n💡 <b>Upgrade to $30 to enable withdrawals</b>\n\n🔥 <u>Share your link & invite more people</u>\n⏳ <i>Don’t miss this pre-launch offer!</i>`,
        `🎁 <b>Start FREE with $10 ID</b> <i>(Valid till 30 April)</i>\n\n👉 <i>Complete 5 directs</i>\n👉 <i>Help your team duplicate</i>\n👉 <i>Build a strong network</i>\n\n💰 <b>Upgrade to $30 & start withdrawals</b>\n\n🚀 <u>More sharing = More growth</u> 📈`,
        `🔥 <b>Pre-Launching Offer – $10 FREE ID</b>\n\n👉 <i>Just 5 directs needed</i>\n👉 <i>Same duplication system</i>\n👉 <i>Unlock all rewards</i>\n\n💡 <b>Withdrawals available after $30 upgrade</b>\n\n⏳ <u>Offer ending soon – Take action now!</u>`
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