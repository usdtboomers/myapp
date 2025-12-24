const express = require('express');
const router = express.Router();

// 🔐 Auth routes
router.use('/auth', require('./auth'));
router.use('/admin', require('./adminAuth'));

// 👤 Functional routes
router.use('/user', require('./user'));
router.use('/admin', require('./admin'));
router.use('/referral', require('./referral'));
router.use('/admin/notifications', require('./adminNotification'));

router.use('/transaction', require('./transaction'));
router.use('/setting', require('./setting'));
router.use('/wallet', require('./wallet'));
router.use('/income', require('./incomeRoutes'));
router.use('/packages', require('./packages'));  // 🔹 Must match frontend request
 // ⚡ ROI
router.use('/roi', require('./roiRoutes'));

// 🎰 Spin
router.use('/spin', require('./spin'));

router.use('/admin', require('./adminManualTransaction'));
router.use('/support', require('./support')); // <-- ADD THIS


router.use('/dashboard', require('./dashboard'));  // 👈 add this




  


// 🌐 Root test
router.get('/', (req, res) => {
  res.send('API is running');
});

module.exports = router;
