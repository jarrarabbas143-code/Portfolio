/**
 * MapRank Agency — Database Connection & Auto-Migration Layer
 * Full MySQL support via mysql2 with automatic table initialization
 * and zero-friction local datastore fallback for instant offline testing.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let pool = null;
let isUsingMySQL = false;

// Embedded fallback store path
const localStorePath = path.join(__dirname, '../../database/local_store.json');

function readLocalStore() {
  try {
    if (!fs.existsSync(localStorePath)) {
      const initial = {
        admins: [
          {
            id: 1,
            username: process.env.DEFAULT_ADMIN_USER || 'arsalan',
            password_hash: bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || 'MapRank2026!', 10),
            full_name: 'Arsalan Abbas',
            email: process.env.DEFAULT_ADMIN_EMAIL || 'abbasarsalan462@gmail.com',
            created_at: new Date().toISOString()
          }
        ],
        inquiries: []
      };
      fs.mkdirSync(path.dirname(localStorePath), { recursive: true });
      fs.writeFileSync(localStorePath, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(localStorePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[LocalStore] Error reading local store:', err);
    return { admins: [], inquiries: [] };
  }
}

function writeLocalStore(data) {
  try {
    fs.mkdirSync(path.dirname(localStorePath), { recursive: true });
    fs.writeFileSync(localStorePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[LocalStore] Error writing local store:', err);
  }
}

/**
 * Initialize Database Connection
 */
async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'maprank_db';

  try {
    // Attempt connecting to MySQL server
    const serverConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 3000
    });

    // Create database if not exists
    await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConnection.end();

    // Create connection pool for the database
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const testConn = await pool.getConnection();
    testConn.release();

    isUsingMySQL = true;
    console.log(`[Database] Connected successfully to MySQL (${host}:${port}/${database})`);

    // Run table migrations
    await runMigrations();
  } catch (err) {
    console.warn(`[Database] MySQL is not reachable (${err.message}).`);
    console.log('[Database] Activating robust embedded datastore fallback for instant zero-config operation.');
    isUsingMySQL = false;
    readLocalStore(); // Ensure local store is initialized
  }
}

/**
 * MySQL Auto-Migration: Creates inquiries & admins tables
 */
async function runMigrations() {
  if (!isUsingMySQL || !pool) return;

  try {
    // 1. Inquiries Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        business_name VARCHAR(150) NOT NULL,
        website VARCHAR(255) DEFAULT NULL,
        service VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        file_path VARCHAR(255) DEFAULT NULL,
        file_original_name VARCHAR(255) DEFAULT NULL,
        status ENUM('New', 'Contacted', 'In Progress', 'Completed', 'Closed') NOT NULL DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Admins Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) DEFAULT 'Arsalan Abbas',
        email VARCHAR(150) DEFAULT 'abbasarsalan462@gmail.com',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Seed Default Admin if missing
    const defaultUser = process.env.DEFAULT_ADMIN_USER || 'arsalan';
    const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'MapRank2026!';
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'abbasarsalan462@gmail.com';

    const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [defaultUser]);
    if (existing.length === 0) {
      const hash = await bcrypt.hash(defaultPass, 10);
      await pool.query(
        'INSERT INTO admins (username, password_hash, full_name, email) VALUES (?, ?, ?, ?)',
        [defaultUser, hash, 'Arsalan Abbas', defaultEmail]
      );
      console.log(`[Database] Default admin account seeded: username="${defaultUser}"`);
    }

    console.log('[Database] MySQL tables verified and ready.');
  } catch (err) {
    console.error('[Database] Migration error:', err.message);
  }
}

/**
 * Universal Query Adapter: Handles both MySQL and Embedded Datastore
 */
const db = {
  isMySQL() {
    return isUsingMySQL;
  },

  async query(sql, params = []) {
    if (isUsingMySQL && pool) {
      return await pool.query(sql, params);
    }

    // Local Datastore emulation for standard operations
    const store = readLocalStore();
    const cleanSql = sql.trim();

    // 1. Admin lookup by username
    if (cleanSql.startsWith('SELECT') && cleanSql.includes('FROM admins WHERE username = ?')) {
      const username = params[0];
      const admin = store.admins.find(a => a.username === username);
      return [admin ? [admin] : []];
    }

    // 2. Admin lookup by id
    if (cleanSql.startsWith('SELECT') && cleanSql.includes('FROM admins WHERE id = ?')) {
      const id = params[0];
      const admin = store.admins.find(a => a.id === id);
      return [admin ? [admin] : []];
    }

    // 3. Inquiries list
    if (cleanSql.startsWith('SELECT') && cleanSql.includes('FROM inquiries')) {
      // Sort DESC by created_at
      const list = [...store.inquiries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return [list];
    }

    // 4. Inquiry lookup by id
    if (cleanSql.startsWith('SELECT') && cleanSql.includes('FROM inquiries WHERE id = ?')) {
      const id = parseInt(params[0], 10);
      const item = store.inquiries.find(i => i.id === id);
      return [item ? [item] : []];
    }

    // 5. Insert Inquiry
    if (cleanSql.startsWith('INSERT INTO inquiries')) {
      const newId = store.inquiries.length > 0 ? Math.max(...store.inquiries.map(i => i.id)) + 1 : 1;
      const [fullName, email, phone, businessName, website, service, message, filePath, fileOriginalName] = params;
      const newInquiry = {
        id: newId,
        full_name: fullName,
        email,
        phone,
        business_name: businessName,
        website,
        service,
        message,
        file_path: filePath,
        file_original_name: fileOriginalName,
        status: 'New',
        created_at: new Date().toISOString()
      };
      store.inquiries.push(newInquiry);
      writeLocalStore(store);
      return [{ insertId: newId, affectedRows: 1 }];
    }

    // 6. Update Status
    if (cleanSql.startsWith('UPDATE inquiries SET status = ? WHERE id = ?')) {
      const [status, id] = params;
      const targetId = parseInt(id, 10);
      const item = store.inquiries.find(i => i.id === targetId);
      if (item) {
        item.status = status;
        item.updated_at = new Date().toISOString();
        writeLocalStore(store);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // 7. Delete Inquiry
    if (cleanSql.startsWith('DELETE FROM inquiries WHERE id = ?')) {
      const targetId = parseInt(params[0], 10);
      const initialCount = store.inquiries.length;
      store.inquiries = store.inquiries.filter(i => i.id !== targetId);
      writeLocalStore(store);
      return [{ affectedRows: initialCount - store.inquiries.length }];
    }

    return [[]];
  }
};

module.exports = {
  initDatabase,
  db
};
