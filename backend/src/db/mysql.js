const mysql = require("mysql2/promise");
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = require("../config");

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rollDateForward(dateText) {
  const input = String(dateText || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const date = new Date(`${input}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (date < today) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return formatDate(date);
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(40) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(40) PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      department VARCHAR(120) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(40) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      club VARCHAR(150) NOT NULL,
      event_date DATE NOT NULL,
      event_time VARCHAR(60) NOT NULL,
      venue VARCHAR(180) NOT NULL,
      seats INT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id VARCHAR(40) PRIMARY KEY,
      event_id VARCHAR(40) NOT NULL,
      event_title VARCHAR(200) NOT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(190) NOT NULL,
      student_year VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_reg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE KEY uq_registration (event_id, email)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      event_id VARCHAR(40) NOT NULL,
      registration_id VARCHAR(40) NOT NULL,
      attended TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (event_id, registration_id),
      CONSTRAINT fk_att_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      CONSTRAINT fk_att_reg FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(40) PRIMARY KEY,
      event_id VARCHAR(40) NOT NULL,
      event_title VARCHAR(200) NOT NULL,
      email VARCHAR(190) NOT NULL,
      name VARCHAR(150) NOT NULL,
      rating INT NOT NULL,
      review TEXT NOT NULL,
      review_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_review_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE KEY uq_review_event_email (event_id, email)
    )
  `);
}

async function seedDefaults() {
  const adminRows = await query("SELECT COUNT(*) AS count FROM admins");
  if (adminRows[0].count === 0) {
    await query(
      "INSERT INTO admins (id, name, email, password) VALUES (?, ?, ?, ?)",
      ["ADM-001", "Campus Admin", "admin@college.edu", "Admin@123"]
    );
  }

  const studentRows = await query("SELECT COUNT(*) AS count FROM students WHERE email = ?", [
    "student.api.test@college.edu",
  ]);
  if (studentRows[0].count === 0) {
    await query(
      "INSERT INTO students (id, full_name, email, department, password) VALUES (?, ?, ?, ?, ?)",
      ["STD-1001", "Aarav Iyer", "student.api.test@college.edu", "Computer Science", "Test@1234"]
    );
  }

  const eventRows = await query("SELECT COUNT(*) AS count FROM events");
  if (eventRows[0].count === 0) {
    const defaultEvents = [
      [
        "EVT-1001",
        "AI Innovation Conclave",
        "Technology",
        "Coding Club",
        "2026-05-12",
        "10:00 AM",
        "Dr. APJ Abdul Kalam Auditorium",
        120,
        "Explore practical AI solutions with startup founders, researchers, and student innovators.",
      ],
      [
        "EVT-1002",
        "Rangmanch Utsav 2026",
        "Culture",
        "Cultural Committee",
        "2026-06-05",
        "05:30 PM",
        "Central Quadrangle",
        300,
        "Celebrate campus culture with folk dance, indie music, theatre, and food stalls.",
      ],
      [
        "EVT-1003",
        "Campus Placement Prep Bootcamp",
        "Career",
        "Training and Placement Cell",
        "2026-05-22",
        "02:00 PM",
        "Training and Placement Cell Hall",
        80,
        "Build interview confidence through resume clinics, mock rounds, and recruiter Q&A.",
      ],
    ];

    for (const event of defaultEvents) {
      await query(
        `INSERT INTO events
         (id, title, category, club, event_date, event_time, venue, seats, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        event
      );
    }
  }
}

async function normalizeExpiredEventDates() {
  const events = await query(
    `SELECT id, DATE_FORMAT(event_date, '%Y-%m-%d') AS eventDate
     FROM events`
  );

  for (const event of events) {
    const nextDate = rollDateForward(event.eventDate);
    if (nextDate !== event.eventDate) {
      await query("UPDATE events SET event_date = ? WHERE id = ?", [nextDate, event.id]);
    }
  }
}

async function initMySql() {
  await ensureSchema();
  await seedDefaults();
  await normalizeExpiredEventDates();
}

module.exports = {
  pool,
  query,
  initMySql,
};
