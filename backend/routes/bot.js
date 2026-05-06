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
    `🚀 <b>Claim Your FREE $10 ID Today!</b> 🚀\n\n👉 <i>Register & start building your team effortlessly!</i>\n👉 <i>Grow your network & earn rewards</i>\n\n💡 <b>IMPORTANT:</b> <i>Top up with a $30 package whenever you are ready to unlock and withdraw your earnings!</i>\n\n🔥 <b>BOOSTER OFFER (May 6 to May 15, 2026)</b> 🔥\n💰 <i>Do 5 Direct Top-Ups of $30</i>\n🎁 <b>Get $30 Gift Reward!</b>\n🎉 <u>Special Benefit: $10 Package Users Can Also Participate!</u>\n\n👉 <i>Start Now & Claim Your Bonus!</i>`,

    `🎁 <b>Double Bonanza: FREE $10 ID + Booster Offer!</b> 🎁\n\n👉 <i>Start your journey with a 100% FREE $10 Package</i>\n👉 <i>Share your link and build a strong network</i>\n💎 <b>Unlock Income:</b> <i>Upgrade to $30 anytime to enable unlimited withdrawals!</i>\n\n🚀 <b>LIMITED TIME BOOSTER (Valid till May 15)</b> 🚀\n💰 <i>Bring 5 Direct $30 Top-Ups & Earn an extra $30 Reward!</i>\n✅ <i>Yes, $10 Free ID users are eligible for this offer too!</i>\n\n⏳ <u>Don't wait, take action and grow your team today!</u>`,

    `🔥 <b>Massive Opportunity – Start FREE, Earn BIG!</b> 🔥\n\n👉 <i>Get your $10 ID absolutely FREE!</i>\n👉 <i>No conditions to build your team – just share & grow</i>\n✅ <i>Top up with $30 when you're ready to withdraw your funds.</i>\n\n🎁 <b>EXCLUSIVE BOOSTER REWARD (May 6 - May 15, 2026)</b> 🎁\n💰 <i>Complete 5 Direct Top-Ups of $30</i>\n🎉 <b>Get an instant $30 Gift Reward!</b>\n💡 <i>$10 Package Users can also participate and earn this bonus!</i>\n\n👉 <u>Start Now & Claim Your Rewards!</u>`
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