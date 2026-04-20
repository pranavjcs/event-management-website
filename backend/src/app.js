const express = require("express");
const cors = require("cors");
const path = require("path");

const { FRONTEND_ROOT } = require("./config");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const registrationRoutes = require("./routes/registrations");
const attendanceRoutes = require("./routes/attendance");
const reviewRoutes = require("./routes/reviews");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", eventRoutes);
app.use("/api", registrationRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", reviewRoutes);
app.use("/api", dashboardRoutes);

app.use(express.static(FRONTEND_ROOT));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, "index.html"));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_ROOT, "404.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
