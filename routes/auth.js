const express    = require("express");
const router     = express.Router();
const bcrypt     = require("bcryptjs");
const nodemailer = require("nodemailer");
const db         = require("../db");
const { Patient, Doctor } = require("../models");
require("dotenv").config();

// Temporary OTP storage { email: "1234" }
const otps = {};

// ── Helper: send email ─────────────────────────────
async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: `"RapidQ" <${process.env.EMAIL_USER}>`,
    to, subject, html,
  });
}

// ── Helper: generate 4-digit OTP ──────────────────
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ── PATIENT SIGN UP ────────────────────────────────
router.post("/signup/patient", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    const exists = await db.query(
      "SELECT Pat_id FROM Patient WHERE Email = @email",
      { email }
    );
    if (exists.length > 0) {
      return res.status(400).json({ ok: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const idRows = await db.query("SELECT ISNULL(MAX(Pat_id), 0) + 1 AS nextId FROM Patient");

    const patient = new Patient({
      id: idRows[0].nextId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await db.query(
      `INSERT INTO Patient (Pat_id, First_name, Last_name, Email, Password)
       VALUES (@patId, @firstName, @lastName, @email, @password)`,
      {
        patId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        password: patient.password,
      }
    );

    const otp = generateOTP();
    otps[patient.email] = otp;
    console.log(`OTP for ${patient.email}: ${otp}`);

    await sendEmail(
      patient.email,
      "Verify your RapidQ account",
      `<h2>Hi ${patient.firstName}!</h2>
       <p>Your verification code is:</p>
       <h1 style="color:#0573E4;letter-spacing:8px">${otp}</h1>`
    );

    res.json({ ok: true, message: "Account created! Check your email for the OTP." });
  } catch (error) {
    console.error("Patient signup error:", error.message);
    res.status(500).json({ ok: false, message: "Signup failed. Please try again." });
  }
});

// ── DOCTOR SIGN UP ─────────────────────────────────
router.post("/signup/doctor", async (req, res) => {
  try {
    const { firstName, lastName, email, password, speciality } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    const exists = await db.query(
      "SELECT Doc_id FROM Doctor WHERE Email = @email",
      { email }
    );
    if (exists.length > 0) {
      return res.status(400).json({ ok: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const idRows = await db.query("SELECT ISNULL(MAX(Doc_id), 0) + 1 AS nextId FROM Doctor");

    const doctor = new Doctor({
      id: idRows[0].nextId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      speciality: speciality || null,
    });

    await db.query(
      `INSERT INTO Doctor (Doc_id, First_name, Last_name, Email, Password, spectiality)
       VALUES (@docId, @firstName, @lastName, @email, @password, @speciality)`,
      {
        docId: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        password: doctor.password,
        speciality: doctor.speciality,
      }
    );

    const otp = generateOTP();
    otps[doctor.email] = otp;
    console.log(`OTP for ${doctor.email}: ${otp}`);

    await sendEmail(
      doctor.email,
      "Verify your RapidQ account",
      `<h2>Hi Dr. ${doctor.firstName}!</h2>
       <p>Your verification code is:</p>
       <h1 style="color:#0573E4;letter-spacing:8px">${otp}</h1>`
    );

    res.json({ ok: true, message: "Account created! Check your email for the OTP." });
  } catch (error) {
    console.error("Doctor signup error:", error.message);
    res.status(500).json({ ok: false, message: "Signup failed. Please try again." });
  }
});

// ── VERIFY OTP (signup) ────────────────────────────
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ ok: false, message: "Email and OTP are required." });
  }

  if (otps[email] !== otp) {
    return res.status(400).json({ ok: false, message: "Wrong code. Try again." });
  }

  delete otps[email];
  res.json({ ok: true, message: "Email verified! You can now log in." });
});

// ── LOGIN ──────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password are required." });
    }

    const rows = await db.query(
      role === "Doctor"
        ? "SELECT * FROM Doctor WHERE Email = @email"
        : "SELECT * FROM Patient WHERE Email = @email",
      { email }
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, message: "No account found with this email." });
    }

    const user = role === "Doctor" ? Doctor.fromRow(rows[0]) : Patient.fromRow(rows[0]);
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ ok: false, message: "Wrong password." });
    }

    const token = `token-${role}-${user.id}`;
    console.log(`${role} logged in: ${email}`);

    res.json({
      ok: true,
      message: "Login successful!",
      token,
      user: { id: user.id, firstName: user.firstName, email: user.email, role }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ ok: false, message: "Login failed. Please try again." });
  }
});

// ── FORGOT PASSWORD: send OTP ──────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, message: "Email is required." });
    }

    const table = role === "Doctor" ? "Doctor" : "Patient";
    const rows  = await db.query(
      `SELECT * FROM ${table} WHERE Email = @email`,
      { email }
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, message: "No account found with this email." });
    }

    const user = role === "Doctor" ? Doctor.fromRow(rows[0]) : Patient.fromRow(rows[0]);
    const otp = generateOTP();
    otps[user.email] = otp;
    console.log(`Reset OTP for ${user.email}: ${otp}`);

    await sendEmail(
      user.email,
      "Reset your RapidQ password",
      `<h2>Hi ${user.firstName}!</h2>
       <p>Your password reset code is:</p>
       <h1 style="color:#0573E4;letter-spacing:8px">${otp}</h1>`
    );

    res.json({ ok: true, message: "OTP sent! Check your email." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ ok: false, message: "Could not send OTP. Please try again." });
  }
});

// ── VERIFY RESET OTP ───────────────────────────────
router.post("/verify-reset-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otps[email] !== otp) {
    return res.status(400).json({ ok: false, message: "Wrong code. Try again." });
  }

  res.json({ ok: true, message: "OTP verified!" });
});

// ── RESET PASSWORD ─────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword, role } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const table          = role === "Doctor" ? "Doctor" : "Patient";

    await db.query(
      `UPDATE ${table} SET Password = @password WHERE Email = @email`,
      { password: hashedPassword, email }
    );

    delete otps[email];
    console.log(`Password reset for: ${email}`);

    res.json({ ok: true, message: "Password updated! You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ ok: false, message: "Could not reset password. Please try again." });
  }
});

module.exports = router;
