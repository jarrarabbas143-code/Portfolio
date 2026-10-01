/**
 * MapRank Agency — Admin Seeder Script
 * Run: npm run seed
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'maprank_db';

  console.log(`Connecting to MySQL database: ${database} on ${host}:${port}...`);

  try {
    const conn = await mysql.createConnection({ host, port, user, password, database });

    const adminUser = process.env.DEFAULT_ADMIN_USER || 'arsalan';
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'MapRank2026!';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'abbasarsalan462@gmail.com';

    const hash = await bcrypt.hash(adminPass, 10);

    // Upsert admin
    await conn.query(`
      INSERT INTO admins (username, password_hash, full_name, email)
      VALUES (?, ?, 'Arsalan Abbas', ?)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
    `, [adminUser, hash, adminEmail]);

    console.log(`[Seed Success] Admin account "${adminUser}" is ready.`);
    console.log(`Password: ${adminPass}`);
    await conn.end();
  } catch (err) {
    console.warn(`[Seed Notice] MySQL connection skipped (${err.message}). Local datastore fallback maintains default admin credentials.`);
  }
}

seed();
