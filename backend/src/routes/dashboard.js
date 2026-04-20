const express = require("express");
const { query } = require("../db/mysql");
const { readDb } = require("../data/store");

const router = express.Router();

function shouldUseFileFallback(error) {
  const code = error && error.code;
  const message = String((error && error.message) || "").toLowerCase();
  const knownCodes = [
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ER_ACCESS_DENIED_ERROR",
    "PROTOCOL_CONNECTION_LOST",
  ];

  if (knownCodes.includes(code)) {
    return true;
  }

  return (
    message.includes("connect") ||
    message.includes("connection") ||
    message.includes("refused") ||
    message.includes("timed out") ||
    message.includes("econn")
  );
}

router.get("/dashboard", async (req, res, next) => {
  try {
    const [eventCountRows, registrationCountRows, events, registrations] = await Promise.all([
      query("SELECT COUNT(*) AS count FROM events"),
      query("SELECT COUNT(*) AS count FROM registrations"),
      query(
        `SELECT
          id,
          title,
          category,
          club,
          DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
          event_time AS time,
          venue,
          description,
          seats
        FROM events
        ORDER BY event_date ASC, created_at ASC`
      ),
      query(
        `SELECT
          id,
          event_id AS eventId,
          event_title AS eventTitle,
          name,
          email,
          student_year AS year
        FROM registrations
        ORDER BY created_at DESC`
      ),
    ]);

    return res.json({
      success: true,
      data: {
        totalEvents: Number(eventCountRows[0].count || 0),
        totalRegistrations: Number(registrationCountRows[0].count || 0),
        events,
        registrations,
      },
    });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      const events = db.events || [];
      const registrations = db.registrations || [];

      return res.json({
        success: true,
        data: {
          totalEvents: events.length,
          totalRegistrations: registrations.length,
          events,
          registrations,
        },
      });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
