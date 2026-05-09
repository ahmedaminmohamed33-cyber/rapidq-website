const sql = require("mssql");
require("dotenv").config();

// ── Database connection config ─────────────────────
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

if (process.env.DB_USER && process.env.DB_PASSWORD) {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

// ── DB class: connects and runs queries ────────────
class DB {
  constructor() {
    this.pool = null;
  }

  // Connect to the database
  async connect() {
    if (!this.pool) {
      this.pool = await sql.connect(config);
      console.log("✅ Connected to MS SQL Server");
    }
    return this.pool;
  }

  // Run any SQL query
  async query(sqlText, params = {}) {
    const pool    = await this.connect();
    const request = pool.request();

    // Add each parameter to the request
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }

    const result = await request.query(sqlText);
    return result.recordset;
  }
}

module.exports = new DB();
