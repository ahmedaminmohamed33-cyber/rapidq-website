const express = require('express');
const path = require('path');
const app = express();

app.use(express.json()); // مهم جداً عشان السيرفر يفهم الـ JSON المبعوث
app.use(express.static(__dirname));

// قاعدة بيانات وهمية للتجربة
const users = [
    { email: "basmalah@rapidq.com", password: "12345678" }
];

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // بنبحث عن المستخدم في قاعدة البيانات
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ success: true, message: "Login successful!" });
    } else {
        res.json({ success: false, message: "Invalid email or password!" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
// Queue data
let queueData = {
  clinicName: "Dr. Ahmed Clinic",
  clinicLocation: "Smouha, Alexandria",
  status: "On Track",
  avgTimePerPatient: 5,
  yourNumber: 27,
  nowServing: 20,
};

// GET queue info
app.get('/api/queue', (req, res) => {
  const patientsAhead = queueData.yourNumber - queueData.nowServing;
  const estimatedWait = patientsAhead * queueData.avgTimePerPatient;
  res.json({ success: true, ...queueData, patientsAhead, estimatedWait });
});

// POST cancel booking
app.post('/api/cancel', (req, res) => {
  res.json({ success: true, message: "Booking cancelled!" });
});
const queueRoutes = require('./routes/queue');
app.use('/api/queue', queueRoutes);