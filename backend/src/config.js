const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_ROOT = path.resolve(__dirname, "..", process.env.FRONTEND_ROOT || "..");
const DB_PATH = path.resolve(__dirname, "..", process.env.DB_PATH || "data/db.json");
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "campus_events";

module.exports = {
  PORT,
  FRONTEND_ROOT,
  DB_PATH,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
};
