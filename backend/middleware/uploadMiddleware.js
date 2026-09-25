const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Ensure destination directory exists at startup
const uploadDir = path.join(__dirname, '..', 'uploads', 'complaints');
fs.mkdirSync(uploadDir, { recursive: true });

// Configure disk storage with randomized UUID filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// File filter enforcing allowed MIME types
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

// Configure Multer instance with 5MB limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Middleware wrapper that catches Multer errors and returns standardized JSON error responses.
 */
const uploadComplaintImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum limit of 5MB',
            error: 'FILE_TOO_LARGE',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          error: 'FILE_UPLOAD_ERROR',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file upload',
        error: err.code || 'INVALID_FILE_TYPE',
      });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadComplaintImage,
};
