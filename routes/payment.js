const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { Payment } = require("../models");

// ── SAVE PAYMENT ───────────────────────────────────
router.post("/pay", async (req, res) => {
  try {
    const token = req.headers["authorization"];
    if (!token) {
      return res.status(401).json({ ok: false, message: "Please log in." });
    }

    const { appId, amount, method } = req.body;

    if (!appId || !amount || !method) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    const idRows = await db.query("SELECT ISNULL(MAX(Pay_id), 0) + 1 AS nextId FROM Payment");
    const payment = new Payment({
      id: idRows[0].nextId,
      appointmentId: appId,
      amount,
      method,
    });

    await db.query(
      `INSERT INTO Payment (Pay_id, App_id, Date, Amount, Status, Method, Time)
       VALUES (@payId, @appId, CAST(GETDATE() AS DATE), @amount, @status, @method, CAST(GETDATE() AS TIME))`,
      {
        payId: payment.id,
        appId: payment.appointmentId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      }
    );

    console.log(`Payment received: ${payment.amount} EGP via ${payment.method} for appointment ${payment.appointmentId}`);

    res.json({ ok: true, message: "Payment successful!" });
  } catch (error) {
    console.error("Payment error:", error.message);
    res.status(500).json({ ok: false, message: "Payment failed. Please try again." });
  }
});

module.exports = router;
