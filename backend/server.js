require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
 
const app = express();

app.use(cors());
app.use(express.json());


const listEndpoints = require('express-list-endpoints');
console.log(listEndpoints(app));

// 📦 Import all routes from routes/index.js
const allRoutes = require('./routes');
app.use('/api', allRoutes);

// 🌐 Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  })
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});
