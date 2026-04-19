require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

// 📦 Imports
const allRoutes = require('./routes'); 
 const startSweeper = require('./cron/sweepJob');
const { startCron } = require('./roiCron');


// const { setupTelegramBot } = require('./utils/telegramBot');

const app = express();

// Middleware
// Middleware
const allowedOrigins = [
  'http://localhost:3000',      // Local React app (is port ko apne hisaab se change kar lena agar 5173 hai toh)
  'http://good.localhost:3000', // Local Admin Subdomain
  'https://usdtboomers.com',     // DHYAN DEIN: Yahan apna live domain dalna
  'https://good.usdtboomers.com' // DHYAN DEIN: Yahan apna live admin subdomain dalna
];

app.use(cors({
  origin: function (origin, callback) {
    // Agar origin allowed list mein hai ya fir origin nahi hai (jaise Postman se testing), toh allow karo
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());


app.use(express.json());

// Routes setup
app.use('/api', allRoutes);

// Debugging: API list print (Ise comment kiya hai taaki terminal clear rahe, zaroorat ho toh hata lena)
// console.log(listEndpoints(app)); 
mongoose.connect(process.env.MONGO_URI) 
  .then(async () => { 
    console.log('✅ MongoDB connected successfully');

    try {
      // 1. 🔥 LIVE LISTENER (Primary)
      // Ise pehle chalu karein taaki live deposits turant dikhein
    

      //2. 🛡️ AUTO SWEEPER (Backup)
     // Agar aapka WSS stable nahi hai, toh isey 5-10 minute ke gap par rakhein
      startSweeper(); // <--- Testing ke liye isey abhi COMMENT (//) kar do
      console.log('✅ Sweeper Cron Started (Backup Mode)');

      // 3. ROI Cron
      await startCron(); 
      console.log('✅ ROI Cron Scheduler Started');
      

      // 4. 🤖 TELEGRAM VERIFICATION BOT
      // 👈 NAYA CODE YAHAN HAI: Database connect hone ke baad bot start kar dein
    //  setupTelegramBot(); 
    //  console.log('✅ Telegram Verification Bot Started');

    } catch (error) {
      console.error('⚠️ Error starting Cron Jobs:', error);
    }

    

    
    // 🚀 Start Express Server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Agar database connect na ho, toh app ko band kar do (safe fail)
  });