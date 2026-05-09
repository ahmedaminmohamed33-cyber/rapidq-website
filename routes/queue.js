const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { Doctor } = require("../models");

// ── GET ALL DOCTORS ────────────────────────────────
router.get("/doctors", async (req, res) => {
  try {
    const rows = await db.query(
      "SELECT Doc_id, First_name, Last_name, speciality, rating, Email FROM Doctor"
    );
    const doctors = rows.map(row => Doctor.fromRow(row).toListItem());
    res.json({ ok: true, doctors });
  } catch (error) {
    console.error("Doctors loading error:", error.message);
    res.status(500).json({ ok: false, message: "Could not load doctors." });
  }
});

// ── GET CLINICS ────────────────────────────────────
router.get("/clinics", async (req, res) => {
  try {
    const clinics = await db.query(
      "SELECT Cl_id, Name, City, Phone, Working_hours FROM Clinic"
    );
    res.json({ ok: true, clinics });
  } catch (error) {
    console.error("Clinics loading error:", error.message);
    res.status(500).json({ ok: false, message: "Could not load clinics." });
  }
});

module.exports = router;
