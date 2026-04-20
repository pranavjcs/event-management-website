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

router.get("/reviews", async (req, res, next) => {
  const { eventId } = req.query;

  try {
    const whereClause = eventId ? "WHERE event_id = ?" : "";
    const params = eventId ? [String(eventId)] : [];

    const rows = await query(
      `SELECT
         id,
         event_id AS eventId,
         event_title AS eventTitle,
         email,
         name,
         rating,
         review,
         DATE_FORMAT(review_date, '%Y-%m-%d') AS date
       FROM reviews
       ${whereClause}
       ORDER BY review_date DESC, created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      let rows = db.reviews || [];
      if (eventId) {
        rows = rows.filter((item) => item.eventId === String(eventId));
      }

      rows = [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return res.json({ success: true, data: rows });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.post("/reviews", async (req, res, next) => {
  const { eventId, eventTitle, email, name, rating, review } = req.body || {};
  if (!eventId || !eventTitle || !email || !name || !rating || !review) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const existing = await query(
      "SELECT id FROM reviews WHERE event_id = ? AND LOWER(email) = LOWER(?) LIMIT 1",
      [String(eventId), String(email).trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "You have already reviewed this event" });
    }

    const reviewId = generateId("REV");
    const sanitizedRating = Math.min(5, Math.max(1, Number(rating)));
    const today = new Date().toISOString().split("T")[0];

    await query(
      `INSERT INTO reviews
      (id, event_id, event_title, email, name, rating, review, review_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        String(eventId),
        String(eventTitle),
        String(email).trim(),
        String(name).trim(),
        sanitizedRating,
        String(review).trim(),
        today,
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: reviewId,
        eventId: String(eventId),
        eventTitle: String(eventTitle),
        email: String(email).trim(),
        name: String(name).trim(),
        rating: sanitizedRating,
        review: String(review).trim(),
        date: today,
      },
    });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const created = withDb((db) => {
        db.reviews = db.reviews || [];
        const exists = db.reviews.some(
          (item) => item.eventId === String(eventId) && normalizeEmail(item.email) === normalizeEmail(email)
        );
        if (exists) {
          return null;
        }

        const reviewItem = {
          id: generateId("REV"),
          eventId: String(eventId),
          eventTitle: String(eventTitle),
          email: String(email).trim(),
          name: String(name).trim(),
          rating: Math.min(5, Math.max(1, Number(rating))),
          review: String(review).trim(),
          date: new Date().toISOString().split("T")[0],
        };

        db.reviews.push(reviewItem);
        return reviewItem;
      });

      if (!created) {
        return res.status(409).json({ success: false, message: "You have already reviewed this event" });
      }

      return res.status(201).json({ success: true, data: created });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
