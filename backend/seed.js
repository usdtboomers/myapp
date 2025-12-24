require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/your-db-name', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

    

    const existing = await User.findOne({ email: 'test@example.com' });
    if (existing) {
      console.log('⚠️ Test user already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Password123', 10);
    const hashedTxn = await bcrypt.hash('TxnSecret123', 10);

    const newUser = new User({
      userId: 100001,
      name: 'Test User',
      email: 'test@example.com',
      mobile: '9999999999',
      country: 'India',
      password: hashedPassword,
      txnPassword: hashedTxn,
      packageAmount: 25,
      revenue: 0,
      deposit: 25
    });
    await newUser.save();
    console.log('✅ Test user created: test@example.com / Password123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();
