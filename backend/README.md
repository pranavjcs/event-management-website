# Backend (Node.js + Express + MySQL)

This backend serves your existing frontend files and stores all data in MySQL.

## 1) Install

```bash
cd backend
npm install
```

## 2) Configure MySQL

Create `backend/.env` from `backend/.env.example`, then set:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Make sure the database in `MYSQL_DATABASE` already exists.

Example:

```env
PORT=5000
FRONTEND_ROOT=..
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=campus_events
```

## 3) Run

```bash
npm run dev
```

or

```bash
npm start
```

Server starts on `http://localhost:5000` by default.

On startup, backend auto-creates required tables and seeds default admin/events when tables are empty.

## 4) Frontend connection

Open your site through:

- `http://localhost:5000/index.html`

## 5) API

- Base URL: `/api`
- Health: `GET /api/health`
