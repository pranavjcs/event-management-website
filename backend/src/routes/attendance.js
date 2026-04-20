const express = require("express");
const { query } = require("../db/mysql");
const { readDb, withDb } = require("../data/store");

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

function getAttendanceMapFromDb(data, eventId) {
  const attendance = (data.attendance || {})[eventId];
  if (!attendance) {
    return {};
  }

  if (Array.isArray(attendance)) {
    const registrations = (data.registrations || []).filter((item) => item.eventId === eventId);
    return registrations.reduce((accumulator, registration) => {
      accumulator[registration.id] = attendance.includes(registration.email);
      return accumulator;
    }, {});
  }

  return { ...attendance };
}

router.get("/attendance/:eventId", async (req, res, next) => {
  try {
    const rows = await query(
      "SELECT registration_id AS registrationId, attended FROM attendance WHERE event_id = ?",
      [req.params.eventId]
    );

    const map = rows.reduce((accumulator, row) => {
      accumulator[row.registrationId] = row.attended === 1;
      return accumulator;
    }, {});

    return res.json({ success: true, data: map });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      return res.json({ success: true, data: getAttendanceMapFromDb(db, req.params.eventId) });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.put("/attendance/:eventId/:registrationId", async (req, res, next) => {
  const attended = Boolean(req.body?.attended);

  try {
    await query(
      `INSERT INTO attendance (event_id, registration_id, attended)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE attended = VALUES(attended)`,
      [req.params.eventId, req.params.registrationId, attended ? 1 : 0]
    );

    const rows = await query(
      "SELECT registration_id AS registrationId, attended FROM attendance WHERE event_id = ?",
      [req.params.eventId]
    );
    const map = rows.reduce((accumulator, row) => {
      accumulator[row.registrationId] = row.attended === 1;
      return accumulator;
    }, {});

    return res.json({ success: true, data: map });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const map = withDb((db) => {
        db.attendance = db.attendance || {};
        const eventId = req.params.eventId;
        const registrationId = req.params.registrationId;

        const current = getAttendanceMapFromDb(db, eventId);
        current[registrationId] = attended;
        db.attendance[eventId] = current;
        return current;
      });

      return res.json({ success: true, data: map });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.get("/attendance-summary", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT
         e.id AS eventId,
         e.title AS title,
         COUNT(DISTINCT r.id) AS registrations,
         COALESCE(SUM(CASE WHEN a.attended = 1 THEN 1 ELSE 0 END), 0) AS attended
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       LEFT JOIN attendance a ON a.event_id = e.id AND a.registration_id = r.id
       GROUP BY e.id, e.title
       ORDER BY e.event_date ASC`
    );

    const summary = rows.map((row) => {
      const registrations = Number(row.registrations || 0);
      const attended = Number(row.attended || 0);
      return {
        eventId: row.eventId,
        title: row.title,
        registrations,
        attended,
        attendancePercent: registrations > 0 ? Math.round((attended / registrations) * 100) : 0,
      };
    });

    return res.json({ success: true, data: summary });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      const events = db.events || [];
      const registrations = db.registrations || [];

      const summary = events
        .map((event) => {
          const eventRegistrations = registrations.filter((item) => item.eventId === event.id);
          const attendanceMap = getAttendanceMapFromDb(db, event.id);
          const attended = eventRegistrations.filter((item) => attendanceMap[item.id] === true).length;
          const registrationCount = eventRegistrations.length;

          return {
            eventId: event.id,
            title: event.title,
            registrations: registrationCount,
            attended,
            attendancePercent: registrationCount > 0 ? Math.round((attended / registrationCount) * 100) : 0,
          };
        })
        .sort((a, b) => String(a.eventId).localeCompare(String(b.eventId)));

      return res.json({ success: true, data: summary });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
