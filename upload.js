/**
 * MapRank Agency — Secure File Upload Middleware (Multer)
 * Restricts extensions, file sizes, and prevents dangerous file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe, unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `inquiry-${uniqueSuffix}${safeExt}`);
  }
});

// File Filter: Whitelist safe document and image formats
const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.txt'];
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain'
];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed. Only PDF, DOC, DOCX, JPG, PNG, WEBP, TXT are permitted.`), false);
  }

  // Dangerous extension block (defense in depth)
  const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.vbs', '.py', '.msi'];
  if (dangerousExts.includes(ext)) {
    return cb(new Error('Executable or dangerous file types are strictly rejected.'), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum size limit
  },
  fileFilter
});

module.exports = upload;
