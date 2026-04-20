const app = require("./app");
const { PORT } = require("./config");
const { initMySql } = require("./db/mysql");

async function startServer() {
  try {
    await initMySql();
  } catch (error) {
    console.error("MySQL init failed. Continuing in degraded mode:", error);
  }

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

startServer();
