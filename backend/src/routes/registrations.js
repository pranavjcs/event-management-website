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

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

router.get("/registrations", async (req, res, next) => {
  const { email, eventId } = req.query;

  try {
    const conditions = [];
    const values = [];

    if (email) {
      conditions.push("LOWER(email) = LOWER(?)");
      values.push(String(email));
    }

    if (eventId) {
      conditions.push("event_id = ?");
      values.push(String(eventId));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query(
      `SELECT
        id,
        event_id AS eventId,
        event_title AS eventTitle,
        name,
        email,
        student_year AS year
      FROM registrations
      ${whereClause}
      ORDER BY created_at DESC`,
      values
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      let rows = db.registrations || [];

      if (email) {
        const lower = normalizeEmail(email);
        rows = rows.filter((item) => normalizeEmail(item.email) === lower);
      }

      if (eventId) {
        rows = rows.filter((item) => item.eventId === String(eventId));
      }

      return res.json({ success: true, data: rows });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.post("/registrations", async (req, res, next) => {
  const { eventId, name, email, year } = req.body || {};

  if (!eventId || !name || !email || !year) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const eventRows = await query("SELECT id, title, seats FROM events WHERE id = ? LIMIT 1", [eventId]);
    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const event = eventRows[0];

    const existingRows = await query(
      "SELECT id FROM registrations WHERE event_id = ? AND LOWER(email) = LOWER(?) LIMIT 1",
      [eventId, String(email).trim()]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ success: false, message: "Already registered for this event" });
    }

    const countRows = await query("SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?", [eventId]);
    if (Number(countRows[0].count) >= Number(event.seats)) {
      return res.status(409).json({ success: false, message: "Event is full" });
    }

    const registrationId = `REG-${Date.now()}`;
    const registration = {
      id: registrationId,
      eventId: String(eventId),
      eventTitle: String(event.title),
      name: String(name).trim(),
      email: String(email).trim(),
      year: String(year).trim(),
    };

    await query(
      `INSERT INTO registrations
      (id, event_id, event_title, name, email, student_year)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [registration.id, registration.eventId, registration.eventTitle, registration.name, registration.email, registration.year]
    );

    return res.status(201).json({ success: true, data: registration });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const registration = withDb((db) => {
        db.events = db.events || [];
        db.registrations = db.registrations || [];

        const event = db.events.find((item) => item.id === String(eventId));
        if (!event) {
          return { type: "not-found" };
        }

        const already = db.registrations.some(
          (item) => item.eventId === String(eventId) && normalizeEmail(item.email) === normalizeEmail(email)
        );
        if (already) {
          return { type: "exists" };
        }

        const count = db.registrations.filter((item) => item.eventId === String(eventId)).length;
        if (count >= Number(event.seats)) {
          return { type: "full" };
        }

        const created = {
          id: generateId("REG"),
          eventId: String(eventId),
          eventTitle: String(event.title),
          name: String(name).trim(),
          email: String(email).trim(),
          year: String(year).trim(),
        };
        db.registrations.push(created);
        return { type: "ok", data: created };
      });

      if (registration.type === "not-found") {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      if (registration.type === "exists") {
        return res.status(409).json({ success: false, message: "Already registered for this event" });
      }

      if (registration.type === "full") {
        return res.status(409).json({ success: false, message: "Event is full" });
      }

      return res.status(201).json({ success: true, data: registration.data });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.delete("/registrations/:id", async (req, res, next) => {
  try {
    const result = await query("DELETE FROM registrations WHERE id = ?", [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    return res.json({ success: true, message: "Registration deleted" });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const deleted = withDb((db) => {
        db.registrations = db.registrations || [];
        db.attendance = db.attendance || {};

        const index = db.registrations.findIndex((item) => item.id === req.params.id);
        if (index < 0) {
          return false;
        }

        const registration = db.registrations[index];
        db.registrations.splice(index, 1);

        const attendanceForEvent = db.attendance[registration.eventId];
        if (attendanceForEvent && typeof attendanceForEvent === "object" && !Array.isArray(attendanceForEvent)) {
          delete attendanceForEvent[registration.id];
        }

        return true;
      });

      if (!deleted) {
        return res.status(404).json({ success: false, message: "Registration not found" });
      }

      return res.json({ success: true, message: "Registration deleted" });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
