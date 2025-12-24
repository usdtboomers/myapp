const express = require('express');
const router = express.Router();
const runDailyROI = require('../roiCron');

// Manual trigger endpoint
router.get('/run', async (req, res) => {
  try {
    await runDailyROI(); // run the same function as cron
    res.json({ success: true, message: "Daily ROI executed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to run ROI" });
  }
});

module.exports = router;
