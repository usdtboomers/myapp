const express = require('express');
const router = express.Router();

// 🔐 Auth routes
router.use('/auth', require('./auth'));
router.use('/admin', require('./adminAuth')); // Ye login check hai, isko rehne do

// 🔥 IMPORTANT: Is line ko yahan UPAR lagao (Generic '/admin' se pehle)
router.use('/admin', require('./adminManualTransaction')); 

// 👤 Functional routes
router.use('/user', require('./user'));

// 👇 Ye generic admin file baad mein aani chahiye
router.use('/admin', require('./admin')); 

router.use('/referral', require('./referral'));
router.use('/admin/notifications', require('./adminNotification'));

router.use('/transaction', require('./transaction'));
router.use('/setting', require('./setting'));
router.use('/wallet', require('./wallet'));
router.use('/income', require('./incomeRoutes'));
router.use('/packages', require('./packages'));
router.use('/roi', require('./roiRoutes'));
router.use('/spin', require('./spin'));
router.use('/support', require('./support'));
router.use('/dashboard', require('./dashboard'));

// 🌐 Root test
router.get('/', (req, res) => {
  res.send('API is running');
});

module.exports = router;