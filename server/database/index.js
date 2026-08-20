/**
 * Innova Ecosystem Database Module
 * SQLite database using sql.js (pure JavaScript implementation)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/innova.db');
    this.initialized = false;
  }

  /**
   * Initialize the database connection
   */
  async init() {
    try {
      const SQL = await initSqlJs();
      
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Try to load existing database
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        console.log(`[DATABASE] Loaded existing database from ${this.dbPath}`);
      } else {
        this.db = new SQL.Database();
        console.log(`[DATABASE] Created new database`);
      }

      // Run schema initialization
      this.runSchema();
      
      // Save initial state
      this.save();

      this.initialized = true;
      console.log(`[DATABASE] Connected to SQLite database at ${this.dbPath}`);
      return this;
    } catch (error) {
      console.error('[DATABASE] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Save database to disk
   */
  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  /**
   * Run database schema initialization
   */
  runSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema SQL
      this.db.run(schema);
      
      console.log('[DATABASE] Schema initialized successfully');
    } catch (error) {
      console.error('[DATABASE] Failed to run schema:', error);
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[DATABASE] Connection closed');
    }
  }

  /**
   * Prepare a statement (returns object with run, get, all methods)
   */
  prepare(sql) {
    const db = this.getDb();
    return {
      run: (...params) => {
        const result = db.exec(`INSERT_DUMMY_RETURNING_ID: ${sql}`, params);
        // For sql.js, we use a simpler approach
        db.run(sql, params);
        return { changes: db.getRowsModified() };
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  /**
   * Execute a query and return all results
   */
  all(sql, params = []) {
    try {
      const stmt = this.getDb().prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (e) {
      // Fallback for simpler queries
      const result = this.getDb().exec(sql.replace(/\?/g, () => {
        const val = params.shift();
        return typeof val === 'string' ? `'${val}'` : val;
      }));
      if (result.length === 0) return [];
      return result[0].values.map(row => {
        const obj = {};
        result[0].columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }
  }

  /**
   * Execute a query and return first result
   */
  get(sql, params = []) {
    try {
      const stmt = this.getDb().prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    } catch (e) {
      // Fallback
      const results = this.all(sql, params);
      return results.length > 0 ? results[0] : undefined;
    }
  }

  /**
   * Execute an insert/update/delete and return changes
   */
  run(sql, params = []) {
    this.getDb().run(sql, params);
    this.save();
    return { changes: this.getDb().getRowsModified() };
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return this.initialized && this.db !== null;
  }

  /**
   * Get database statistics
   */
  getStats() {
    const tables = [
      'users', 'refresh_tokens', 'trusted_devices', 'profile_sync_log',
      'pairing_codes', 'subscription_plans', 'subscriptions', 
      'cancellation_surveys', 'invoices', 'device_codes', 
      'access_tokens', 'deletion_requests', 'sessions', 'audit_log'
    ];

    const stats = {};
    
    tables.forEach(table => {
      try {
        const result = this.get(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result ? result.count : 0;
      } catch (e) {
        stats[table] = 0;
      }
    });

    return {
      database_path: this.dbPath,
      connected: this.isConnected(),
      tables: stats,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

// Initialize on module load if DATABASE_AUTO_INIT is true
if (process.env.DATABASE_AUTO_INIT !== 'false') {
  dbManager.init().catch(err => {
    console.error('[DATABASE] Auto-init failed:', err);
  });
}

module.exports = dbManager;