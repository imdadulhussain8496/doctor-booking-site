const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');

// GET /api/doctors - Public route for patients
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
