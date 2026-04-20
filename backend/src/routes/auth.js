const express = require("express");
const { query } = require("../db/mysql");
const { readDb, withDb } = require("../data/store");

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

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

  // mysql2 occasionally surfaces connection failures without a stable code.
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

function toStudentPayload(student) {
  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    department: student.department,
    password: student.password,
  };
}

router.post("/auth/register", async (req, res, next) => {
  const { fullName, email, department, password } = req.body || {};

  if (!fullName || !email || !department || !password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const studentId = generateId("STD");
  const normalizedEmail = normalizeEmail(email);
  const studentPayload = {
    id: studentId,
    fullName: String(fullName).trim(),
    email: String(email).trim(),
    department: String(department).trim(),
    password: String(password),
  };

  try {
    const existing = await query("SELECT id FROM students WHERE LOWER(email) = LOWER(?) LIMIT 1", [
      String(email).trim(),
    ]);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Student already registered" });
    }

    await query(
      "INSERT INTO students (id, full_name, email, department, password) VALUES (?, ?, ?, ?, ?)",
      [studentPayload.id, studentPayload.fullName, studentPayload.email, studentPayload.department, studentPayload.password]
    );

    return res.status(201).json({
      success: true,
      data: studentPayload,
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Student already registered" });
    }

    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const created = withDb((data) => {
        const exists = data.students.some((student) => normalizeEmail(student.email) === normalizedEmail);
        if (exists) {
          return null;
        }

        data.students.push(studentPayload);
        return studentPayload;
      });

      if (!created) {
        return res.status(409).json({ success: false, message: "Student already registered" });
      }

      return res.status(201).json({ success: true, data: created });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.post("/auth/login", async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const students = await query(
      `SELECT id, full_name AS fullName, email, department, password
       FROM students
       WHERE LOWER(email) = LOWER(?) AND password = ?
       LIMIT 1`,
      [String(email).trim(), String(password)]
    );

    if (students.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid student credentials" });
    }

    return res.json({ success: true, data: students[0] });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      const student = db.students.find(
        (item) => normalizeEmail(item.email) === normalizeEmail(email) && String(item.password) === String(password)
      );

      if (!student) {
        return res.status(401).json({ success: false, message: "Invalid student credentials" });
      }

      return res.json({ success: true, data: toStudentPayload(student) });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

router.post("/auth/admin/login", async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const admins = await query(
      "SELECT id, name, email, password FROM admins WHERE LOWER(email) = LOWER(?) AND password = ? LIMIT 1",
      [String(email).trim(), String(password)]
    );

    if (admins.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    return res.json({ success: true, data: admins[0] });
  } catch (error) {
    if (!shouldUseFileFallback(error)) {
      return next(error);
    }

    try {
      const db = readDb();
      const admin = db.admins.find(
        (item) => normalizeEmail(item.email) === normalizeEmail(email) && String(item.password) === String(password)
      );

      if (!admin) {
        return res.status(401).json({ success: false, message: "Invalid admin credentials" });
      }

      return res.json({ success: true, data: admin });
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
});

module.exports = router;
