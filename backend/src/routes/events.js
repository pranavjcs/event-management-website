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

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateDiff = String(a.date).localeCompare(String(b.date));
    if (dateDiff !== 0) return dateDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

router.get("/events", async (req, res, next) => {
  try {
    const events = await query(
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
    );

    res.json({ success: true, data: events });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      return res.json({ success: true, data: sortEvents(db.events || []) });
    } catch (fallbackError) {
      return next(fallbackError);
    }

    next(error);
  }
});

router.get("/events/:id", async (req, res, next) => {
  try {
    const rows = await query(
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
      WHERE id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      const event = (db.events || []).find((item) => item.id === req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      return res.json({ success: true, data: event });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.post("/events", async (req, res, next) => {
  const { title, category, date, time, club, venue, seats, description } = req.body || {};

  if (!title || !category || !date || !time || !club || !venue || seats == null || !description) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const eventId = generateId("EVT");
    const eventData = {
      id: eventId,
      title: String(title).trim(),
      category: String(category).trim(),
      date: String(date),
      time: String(time),
      club: String(club).trim(),
      venue: String(venue).trim(),
      seats: Number(seats),
      description: String(description).trim(),
    };

    await query(
      `INSERT INTO events
      (id, title, category, club, event_date, event_time, venue, seats, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventData.id,
        eventData.title,
        eventData.category,
        eventData.club,
        eventData.date,
        eventData.time,
        eventData.venue,
        eventData.seats,
        eventData.description,
      ]
    );

    return res.status(201).json({ success: true, data: eventData });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const eventData = withDb((db) => {
        const item = {
          id: generateId("EVT"),
          title: String(title).trim(),
          category: String(category).trim(),
          date: String(date),
          time: String(time),
          club: String(club).trim(),
          venue: String(venue).trim(),
          seats: Number(seats),
          description: String(description).trim(),
        };
        db.events = db.events || [];
        db.events.push(item);
        return item;
      });

      return res.status(201).json({ success: true, data: eventData });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.put("/events/:id", async (req, res, next) => {
  const { title, category, date, time, club, venue, seats, description } = req.body || {};

  try {
    const existing = await query("SELECT id FROM events WHERE id = ? LIMIT 1", [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    await query(
      `UPDATE events
       SET
         title = COALESCE(?, title),
         category = COALESCE(?, category),
         event_date = COALESCE(?, event_date),
         event_time = COALESCE(?, event_time),
         club = COALESCE(?, club),
         venue = COALESCE(?, venue),
         seats = COALESCE(?, seats),
         description = COALESCE(?, description)
       WHERE id = ?`,
      [
        title != null ? String(title).trim() : null,
        category != null ? String(category).trim() : null,
        date != null ? String(date) : null,
        time != null ? String(time) : null,
        club != null ? String(club).trim() : null,
        venue != null ? String(venue).trim() : null,
        seats != null ? Number(seats) : null,
        description != null ? String(description).trim() : null,
        req.params.id,
      ]
    );

    const updatedRows = await query(
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
      WHERE id = ?
      LIMIT 1`,
      [req.params.id]
    );

    return res.json({ success: true, data: updatedRows[0] });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const updated = withDb((db) => {
        db.events = db.events || [];
        const index = db.events.findIndex((item) => item.id === req.params.id);
        if (index < 0) {
          return null;
        }

        const current = db.events[index];
        const next = {
          ...current,
          ...(title != null ? { title: String(title).trim() } : {}),
          ...(category != null ? { category: String(category).trim() } : {}),
          ...(date != null ? { date: String(date) } : {}),
          ...(time != null ? { time: String(time) } : {}),
          ...(club != null ? { club: String(club).trim() } : {}),
          ...(venue != null ? { venue: String(venue).trim() } : {}),
          ...(seats != null ? { seats: Number(seats) } : {}),
          ...(description != null ? { description: String(description).trim() } : {}),
        };
        db.events[index] = next;
        return next;
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      return res.json({ success: true, data: updated });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.delete("/events/:id", async (req, res, next) => {
  try {
    const result = await query("DELETE FROM events WHERE id = ?", [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, message: "Event deleted" });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const deleted = withDb((db) => {
        db.events = db.events || [];
        db.registrations = db.registrations || [];
        db.reviews = db.reviews || [];
        db.attendance = db.attendance || {};

        const before = db.events.length;
        db.events = db.events.filter((item) => item.id !== req.params.id);
        if (db.events.length === before) {
          return false;
        }

        db.registrations = db.registrations.filter((item) => item.eventId !== req.params.id);
        db.reviews = db.reviews.filter((item) => item.eventId !== req.params.id);
        delete db.attendance[req.params.id];
        return true;
      });

      if (!deleted) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      return res.json({ success: true, message: "Event deleted" });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
