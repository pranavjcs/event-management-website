const express = require("express");
const { query } = require("../db/mysql");

const router = express.Router();

router.get("/health", async (req, res, next) => {
  try {
    await query("SELECT 1 AS ok");

    res.json({
      success: true,
      message: "Backend is running",
      database: "MySQL connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
