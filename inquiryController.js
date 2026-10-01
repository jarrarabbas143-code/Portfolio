/**
 * MapRank Agency — Inquiry Controller
 * Manages client inquiries, file attachments, status tracking, and notification triggers
 */

const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { sendInquiryNotification } = require('../utils/email');

/**
 * Valid Status Transitions
 */
const VALID_STATUSES = ['New', 'Contacted', 'In Progress', 'Completed', 'Closed'];

/**
 * POST /api/inquiries
 * Public submission of client inquiry with server-side validation and file handling
 */
async function submitInquiry(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      businessName,
      website,
      service,
      message
    } = req.body;

    // Server-Side Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'A valid full name is required (minimum 2 characters).' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'A valid phone or WhatsApp number is required.' });
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Business name is required.' });
    }

    if (!service || typeof service !== 'string' || service.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please select a service interested in.' });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Project description message must be at least 10 characters.' });
    }

    // Process File if uploaded
    let filePath = null;
    let fileOriginalName = null;

    if (req.file) {
      filePath = req.file.filename;
      fileOriginalName = req.file.originalname;
    }

    const cleanWebsite = website && website.trim().length > 0 ? website.trim() : null;

    // Database Insertion
    const insertSql = `
      INSERT INTO inquiries 
      (full_name, email, phone, business_name, website, service, message, file_path, file_original_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      fullName.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      businessName.trim(),
      cleanWebsite,
      service.trim(),
      message.trim(),
      filePath,
      fileOriginalName
    ]);

    const newInquiryId = result.insertId || result.id || Date.now();

    // Trigger Email Notification (non-blocking for fast client response)
    sendInquiryNotification({
      id: newInquiryId,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      website: cleanWebsite,
      service: service.trim(),
      message: message.trim(),
      file: req.file
    }).catch(err => {
      console.error('[Inquiry Controller] Async email dispatch error:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting MapRank. Your inquiry has been received. We will get back to you soon.',
      inquiryId: newInquiryId
    });
  } catch (err) {
    console.error('[Inquiry Controller] Submission error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred processing your inquiry. Please try again or reach out on WhatsApp.'
    });
  }
}

/**
 * GET /api/inquiries
 * Admin Protected: Retrieve all inquiries
 */
async function getAllInquiries(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    return res.status(200).json({
      success: true,
      count: rows.length,
      inquiries: rows
    });
  } catch (err) {
    console.error('[Inquiry Controller] getAllInquiries error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inquiries from database.'
    });
  }
}

/**
 * GET /api/inquiries/:id
 * Admin Protected: Retrieve single inquiry
 */
async function getInquiryById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM inquiries WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    return res.status(200).json({
      success: true,
      inquiry: rows[0]
    });
  } catch (err) {
    console.error('[Inquiry Controller] getInquiryById error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching inquiry details.'
    });
  }
}

/**
 * PATCH /api/inquiries/:id/status
 * Admin Protected: Update inquiry status (New, Contacted, In Progress, Completed, Closed)
 */
async function updateInquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [result] = await db.query('UPDATE inquiries SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found or status already identical.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Inquiry status successfully updated to "${status}".`,
      status
    });
  } catch (err) {
    console.error('[Inquiry Controller] updateStatus error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status in database.'
    });
  }
}

/**
 * DELETE /api/inquiries/:id
 * Admin Protected: Delete inquiry and purge uploaded file
 */
async function deleteInquiry(req, res) {
  try {
    const { id } = req.params;

    // Check if record exists and has file
    const [rows] = await db.query('SELECT file_path FROM inquiries WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    const inquiry = rows[0];

    // Delete record from database
    await db.query('DELETE FROM inquiries WHERE id = ?', [id]);

    // Delete file from disk if present
    if (inquiry.file_path) {
      const fullPath = path.join(__dirname, '../../uploads', inquiry.file_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (fileErr) {
          console.warn('[Inquiry Controller] File unlink notice:', fileErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Inquiry #${id} deleted successfully.`
    });
  } catch (err) {
    console.error('[Inquiry Controller] deleteInquiry error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry.'
    });
  }
}

/**
 * GET /api/inquiries/:id/file
 * Admin Protected: Securely stream uploaded file for download
 */
async function downloadInquiryFile(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT file_path, file_original_name FROM inquiries WHERE id = ?', [id]);

    if (!rows || rows.length === 0 || !rows[0].file_path) {
      return res.status(404).json({
        success: false,
        message: 'File not found for this inquiry.'
      });
    }

    const { file_path, file_original_name } = rows[0];
    const fullPath = path.join(__dirname, '../../uploads', file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File does not exist on disk.'
      });
    }

    return res.download(fullPath, file_original_name || 'inquiry-attachment');
  } catch (err) {
    console.error('[Inquiry Controller] downloadInquiryFile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error downloading file.'
    });
  }
}

module.exports = {
  submitInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
  downloadInquiryFile
};
