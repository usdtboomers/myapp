const express = require("express");
const router = express.Router();
const Support = require("../models/Support");
const authMiddleware = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminAuth");

// -------------------
// Create support (user)
// -------------------
router.post("/create", authMiddleware, async (req, res) => {
  const { message, email, walletAddress, optional } = req.body;
  const user = req.user;

  try {
    const support = await Support.create({
      userId: user.userId,
      name: user.name,
      email: email || user.email,
      referralId: user.referralId || null,
      message,
      walletAddress,
      optional,
      status: "Pending", // explicitly
    });
    res.status(201).json({ success: true, support });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------
// Get all supports (admin)
// -------------------

// Get all supports (admin)
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const supports = await Support.find({ adminDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, supports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update status
router.put("/status/:id", verifyAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const support = await Support.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ success: true, support });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Soft delete (admin only)
router.put("/soft-delete/:id", verifyAdmin, async (req, res) => {
  try {
    const support = await Support.findByIdAndUpdate(
      req.params.id,
      { adminDeleted: true },
      { new: true }
    );
    res.json({ success: true, support });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
