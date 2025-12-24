require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

// 📦 Routes aur Cron functions import karein
const allRoutes = require('./routes');
const { runDailyPlanIncome, migratePlanIncome } = require('./roiCron');

const app = express();

app.use(cors());
app.use(express.json());

// Routes setup
app.use('/api', allRoutes);

// Debugging: API list dekhne ke liye
console.log(listEndpoints(app));

// 🌐 Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {  // <-- Yahan 'async' lagaya hai taaki await kaam kare
  console.log('✅ MongoDB connected');

  try {
    // Database connect hote hi migration aur cron functions chalenge
    await migratePlanIncome();
    await runDailyPlanIncome();
    console.log('✅ Initial Cron tasks completed');
  } catch (error) {
    console.error('⚠️ Error running cron functions:', error);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});