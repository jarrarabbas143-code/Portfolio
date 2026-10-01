/**
 * MapRank Agency — Main API Routes
 */

const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const inquiryController = require('../controllers/inquiryController');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    agency: 'MapRank',
    founder: 'Arsalan Abbas',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes
router.post('/auth/login', authController.login);
router.get('/auth/me', requireAuth, authController.getMe);

// Public Inquiry Submission (with optional file upload)
router.post(
  '/inquiries',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error.'
        });
      }
      next();
    });
  },
  inquiryController.submitInquiry
);

// Protected Admin Inquiry Management
router.get('/inquiries', requireAuth, inquiryController.getAllInquiries);
router.get('/inquiries/:id', requireAuth, inquiryController.getInquiryById);
router.patch('/inquiries/:id/status', requireAuth, inquiryController.updateInquiryStatus);
router.delete('/inquiries/:id', requireAuth, inquiryController.deleteInquiry);
router.get('/inquiries/:id/file', requireAuth, inquiryController.downloadInquiryFile);

module.exports = router;
