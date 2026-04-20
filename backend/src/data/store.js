const fs = require("fs");
const path = require("path");
const { DB_PATH } = require("../config");

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      admins: [
        {
          id: "ADM-001",
          name: "Campus Admin",
          email: "admin@college.edu",
          password: "Admin@123",
        },
      ],
      students: [
        {
          id: "STD-1001",
          fullName: "Aarav Iyer",
          email: "student.api.test@college.edu",
          department: "Computer Science",
          password: "Test@1234",
        },
      ],
      events: [],
      registrations: [],
      attendance: {},
      reviews: [],
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  }
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

function normalizeEventDates(data) {
  if (!data || !Array.isArray(data.events)) {
    return { data, changed: false };
  }

  let changed = false;
  data.events = data.events.map((event) => {
    const nextDate = rollDateForward(event && event.date);
    if (event && event.date !== nextDate) {
      changed = true;
      return { ...event, date: nextDate };
    }
    return event;
  });

  return { data, changed };
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const normalized = normalizeEventDates(parsed);
  if (normalized.changed) {
    fs.writeFileSync(DB_PATH, JSON.stringify(normalized.data, null, 2), "utf-8");
  }
  return normalized.data;
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function withDb(mutator) {
  const data = readDb();
  const result = mutator(data);
  writeDb(data);
  return result;
}

module.exports = {
  readDb,
  writeDb,
  withDb,
};
