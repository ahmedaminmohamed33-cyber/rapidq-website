const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/booking", require("./routes/booking"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/queue",   require("./routes/queue"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/Home.html");
});


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    message: "Server error. Check the terminal for details.",
  });
});

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
