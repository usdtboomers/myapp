require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');
const path = require('path'); // 👈 NAYA: Path module add kiya hai

// 📦 Imports
const allRoutes = require('./routes'); 
const startSweeper = require('./cron/sweepJob');
const { startCron } = require('./roiCron');

// const { setupTelegramBot } = require('./utils/telegramBot');

const app = express();
app.set('trust proxy', true); // 🔥 YE SABSE ZAROORI HAI NGINX KE LIYE

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://good.localhost:3000',
  'https://usdtboomers.com',
  'http://usdtboomers.com',       // 👈 Bina SSL wala allow karo
  'https://www.usdtboomers.com',   // 👈 www wala allow karo
  'http://www.usdtboomers.com',
  'https://good.usdtboomers.com',
  'http://good.usdtboomers.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes setup
app.use('/api', allRoutes);

// 👇 ============================================================== 👇
// 👇 NAYA CODE: Ye React app ki routing ko handle karega 👇
// Dhyan dein: Agar aapke frontend ke build folder ka naam 'dist' hai toh 'build' ki jagah 'dist' likh dein.
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});
// 👆 NAYA CODE YAHAN KHATAM HAI 👆
// 👆 ============================================================== 👆

// Debugging: API list print (Ise comment kiya hai taaki terminal clear rahe)
// console.log(listEndpoints(app)); 

mongoose.connect(process.env.MONGO_URI) 
  .then(async () => { 
    console.log('✅ MongoDB connected successfully');

    try {
      // 1. 🔥 LIVE LISTENER (Primary)
      // Ise pehle chalu karein taaki live deposits turant dikhein
      
      //2. 🛡️ AUTO SWEEPER (Backup)
      startSweeper(); // <--- Testing ke liye isey abhi COMMENT (//) kar do
      console.log('✅ Sweeper Cron Started (Backup Mode)');

      // 3. ROI Cron
      await startCron(); 
      console.log('✅ ROI Cron Scheduler Started');
      
      // 4. 🤖 TELEGRAM VERIFICATION BOT
      // setupTelegramBot(); 
      // console.log('✅ Telegram Verification Bot Started');

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