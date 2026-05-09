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
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    process.env.EMAIL_USER === "your_gmail@gmail.com" ||
    process.env.EMAIL_PASS === "your_gmail_app_password"
  ) {
    throw new Error("Email is not configured.");
  }

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

function validPhone(phone) {
  return /^\d{11}$/.test(phone);
}

async function insertPatient(patient) {
  const columns = await getColumns("Patient");
  const insert = buildPersonInsert("Patient", columns, {
    Pat_id: ["patId", patient.id],
    First_name: ["firstName", patient.firstName],
    Last_name: ["lastName", patient.lastName],
    Email: ["email", patient.email],
    Password: ["password", patient.password],
    Gender: ["gender", patient.gender],
    Birthdate: ["birthdate", patient.birthdate],
    Phone: ["phone", patient.phone],
    City: ["city", patient.city],
    Street: ["street", patient.street],
  });

  await db.query(insert.sql, insert.params);
}

async function insertDoctor(doctor) {
  const columns = await getColumns("Doctor");
  const specialityColumn = columns.has("speciality") ? columns.get("speciality") : columns.get("spectiality");
  const insert = buildPersonInsert("Doctor", columns, {
    Doc_id: ["docId", doctor.id],
    First_name: ["firstName", doctor.firstName],
    Last_name: ["lastName", doctor.lastName],
    Email: ["email", doctor.email],
    Password: ["password", doctor.password],
    [specialityColumn]: ["speciality", doctor.speciality],
    Gender: ["gender", doctor.gender],
    Birthdate: ["birthdate", doctor.birthdate],
    Phone: ["phone", doctor.phone],
    City: ["city", doctor.city],
    Street: ["street", doctor.street],
  });

  await db.query(insert.sql, insert.params);
}

async function getColumns(table) {
  const rows = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table",
    { table }
  );
  return new Map(rows.map(row => [row.COLUMN_NAME.toLowerCase(), row.COLUMN_NAME]));
}

function buildPersonInsert(table, existingColumns, requestedColumns) {
  const columnNames = [];
  const parameterNames = [];
  const params = {};

  for (const [columnName, [paramName, value]] of Object.entries(requestedColumns)) {
    const realColumnName = existingColumns.get(columnName.toLowerCase());
    if (!realColumnName) continue;
    columnNames.push(realColumnName);
    parameterNames.push(`@${paramName}`);
    params[paramName] = value;
  }

  return {
    sql: `INSERT INTO ${table} (${columnNames.join(", ")}) VALUES (${parameterNames.join(", ")})`,
    params,
  };
}

async function updateExistingProfile(table, email, profile) {
  const columns = await getColumns(table);
  const updates = [];
  const params = { email };

  const fields = {
    Gender: ["gender", profile.gender],
    Birthdate: ["birthdate", profile.birthdate],
    Phone: ["phone", profile.phone],
    City: ["city", profile.city],
    Street: ["street", profile.street],
  };

  for (const [columnName, [paramName, value]] of Object.entries(fields)) {
    const realColumnName = columns.get(columnName.toLowerCase());
    if (!realColumnName) continue;
    updates.push(`${realColumnName} = @${paramName}`);
    params[paramName] = value;
  }

  if (updates.length === 0) return;

  await db.query(
    `UPDATE ${table} SET ${updates.join(", ")} WHERE Email = @email`,
    params
  );
}

// ── PATIENT SIGN UP ────────────────────────────────
router.post("/signup/patient", async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, birthdate, phone, city, street } = req.body;

    if (!firstName || !lastName || !email || !password || !gender || !birthdate || !phone || !city || !street) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }
    if (!validPhone(phone)) {
      return res.status(400).json({ ok: false, message: "Phone number must be 11 digits." });
    }

    const exists = await db.query(
      "SELECT Pat_id FROM Patient WHERE Email = @email",
      { email }
    );
    if (exists.length > 0) {
      await updateExistingProfile("Patient", email, { gender, birthdate, phone, city, street });
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
      gender,
      birthdate,
      phone,
      city,
      street,
    });

    await insertPatient(patient);

    res.json({ ok: true, message: "Account created! You can now log in." });
  } catch (error) {
    console.error("Patient signup error:", error.message);
    res.status(500).json({ ok: false, message: "Signup failed. Please try again." });
  }
});

// ── DOCTOR SIGN UP ─────────────────────────────────
router.post("/signup/doctor", async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, birthdate, phone, city, street } = req.body;
    const speciality = req.body.specialization || req.body.speciality;

    if (!firstName || !lastName || !email || !password || !speciality || !gender || !birthdate || !phone || !city || !street) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }
    if (!validPhone(phone)) {
      return res.status(400).json({ ok: false, message: "Phone number must be 11 digits." });
    }

    const exists = await db.query(
      "SELECT Doc_id FROM Doctor WHERE Email = @email",
      { email }
    );
    if (exists.length > 0) {
      await updateExistingProfile("Doctor", email, { gender, birthdate, phone, city, street });
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
      gender,
      birthdate,
      phone,
      city,
      street,
    });

    await insertDoctor(doctor);

    res.json({ ok: true, message: "Account created! You can now log in." });
  } catch (error) {
    console.error("Doctor signup error:", error.message);
    res.status(500).json({ ok: false, message: "Signup failed. Please try again." });
  }
});

// ── VERIFY OTP (signup) ────────────────────────────
router.post("/verify-otp", (req, res) => {
  res.status(410).json({ ok: false, message: "Email verification is disabled." });
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
    const isHashedPassword = typeof user.password === "string" && user.password.startsWith("$2");
    const match = isHashedPassword
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

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
  res.status(410).json({ ok: false, message: "Email verification is disabled." });
});

// ── VERIFY RESET OTP ───────────────────────────────
router.post("/verify-reset-otp", (req, res) => {
  res.status(410).json({ ok: false, message: "Password reset verification is disabled." });
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
