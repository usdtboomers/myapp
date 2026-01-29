require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

// 📦 Routes import
const allRoutes = require('./routes');

// ✅ CHANGE 1: Sirf 'startCron' import karein (Yeh sab kuch handle karega)
const { startCron } = require('./roiCron');

const app = express();

app.use(cors());
app.use(express.json());

// Routes setup
app.use('/api', allRoutes);

// Debugging: API list print
console.log(listEndpoints(app));

// 🌐 Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI) // options ki zaroorat nahi hoti naye mongoose me
.then(async () => { 
  console.log('✅ MongoDB connected');

  try {
    // ✅ CHANGE 2: 'startCron' call karein. 
    // Yeh Migration karega -> Daily Income dega -> Aur Raat 12 baje ka Timer set karega.
    await startCron(); 
    
    console.log('✅ Cron Scheduler & Initial Tasks Started');
  } catch (error) {
    console.error('⚠️ Error starting Cron:', error);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});