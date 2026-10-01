/**
 * MapRank Agency — Admin Authentication Controller
 * Validates admin credentials using secure bcrypt password hashing
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const cleanUsername = String(username).trim();

    // Query admin user
    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [cleanUsername]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const admin = rows[0];

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Issue JWT token
    const secret = process.env.JWT_SECRET || 'maprank_default_jwt_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        email: admin.email
      },
      secret,
      { expiresIn }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        email: admin.email
      }
    });
  } catch (err) {
    console.error('[Auth Controller] Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const adminId = req.admin.id;
    const [rows] = await db.query('SELECT id, username, full_name, email, created_at FROM admins WHERE id = ?', [adminId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: rows[0]
    });
  } catch (err) {
    console.error('[Auth Controller] getMe error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
}

module.exports = {
  login,
  getMe
};
