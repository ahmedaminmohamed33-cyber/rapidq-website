const express = require("express");
const router  = express.Router();

const users = [];

router.post("/signup", (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ ok: false, message: "All fields are required." });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ ok: false, message: "Email already registered." });
  }

  users.push({ id: users.length + 1, firstName, lastName, email, password });
  console.log("New user:", email);

  res.json({ ok: true, message: "Account created!" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ ok: false, message: "Wrong email or password." });
  }

  console.log("User logged in:", email);

  res.json({
    ok:      true,
    message: "Login successful!",
    token:   `token-${user.id}`,
    user:    { id: user.id, firstName: user.firstName, email: user.email }
  });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, message: "Email is required." });
  }

  console.log("Reset requested for:", email);
  res.json({ ok: true, message: "Reset link sent! (coming soon)" });
});

router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ ok: false, message: "Missing fields." });
  }

  console.log("Password reset for token:", token);
  res.json({ ok: true, message: "Password updated!" });
});

router.get("/verify-email", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ ok: false, message: "No token provided." });
  }

  console.log("Email verified, token:", token);
  res.json({ ok: true, message: "Email verified!" });
});

module.exports = router;