require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// 📦 Imports
const allRoutes = require('./routes'); 
const startSweeper = require('./cron/sweepJob');
const { startCron } = require('./roiCron');
const startTelegramBot = require('./routes/bot'); // Ise upar lagana

const app = express();
app.set('trust proxy', true); // 🔥 NGINX & REAL IP KE LIYE ZAROORI

// ====================== 1. CORS SETUP ======================
// ====================== 1. CORS SETUP ======================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://good.localhost:3000',
  'http://localhost:5000',       // 🔥 NAYA: Aapke error ke hisaab se isey allow karna zaroori hai
  'http://127.0.0.1:5000',       // 🔥 NAYA
  'https://usdtboomers.com',
  'http://usdtboomers.com',
  'https://www.usdtboomers.com',
  'http://www.usdtboomers.com',
  'https://good.usdtboomers.com',
  'http://good.usdtboomers.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Agar Postman/Server se request aaye toh pass karo
    if (!origin) return callback(null, true);

    // 🔥 SMART FIX: Agar origin ke aakhri mein slash (/) aa raha hai, toh usay hata do taaki exact match ho
    const cleanOrigin = origin.replace(/\/$/, "");

    // Ab check karo allowed list mein
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ====================== 2. API ROUTES ======================
app.use('/api', allRoutes);

// 🛡️ API 404 HANDLER (Ye bahut zaroori hai)
// Agar koi /api/xyz galat type karega toh HTML nahi, JSON error aayega
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: "API Route Not Found!" });
});


// ====================== 3. FRONTEND SERVING ======================
// Agar aap frontend aur backend ek hi server (Node) se chala rahe ho
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
} else {
  // Local development mein jab aap React alag chalate ho (npm start)
  app.get('/', (req, res) => {
    res.send('API is running locally... Use React Dev Server for UI.');
  });
}

// ====================== 4. DATABASE & SERVER ======================
mongoose.connect(process.env.MONGO_URI) 
  .then(async () => { 
    console.log('✅ MongoDB connected successfully');

    try {
      // 1. Auto Sweeper (Backup)
      startSweeper(); 
      console.log('✅ Sweeper Cron Started');

      // 2. ROI Cron
      await startCron(); 
      console.log('✅ ROI Cron Scheduler Started');

    } catch (error) {
      console.error('⚠️ Error starting Cron Jobs:', error);
    }


    //3 Aur Mongoose connect hone ke baad:
startTelegramBot();

    // 🚀 Start Express Server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });