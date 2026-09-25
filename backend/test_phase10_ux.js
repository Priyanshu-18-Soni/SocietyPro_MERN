const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const helmet = require('helmet');

const Complaint = require('./models/Complaint');
const { uploadComplaintImage } = require('./middleware/uploadMiddleware');
const validate = require('./middleware/validate');
const { createComplaintSchema } = require('./validations/schemas');
const { createComplaint } = require('./controllers/complaintController');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runPhase10Tests() {
  console.log('============================================================');
  console.log('RUNNING PHASE 10 UX ENHANCEMENTS TEST SUITE');
  console.log('============================================================\n');

  // Stub Complaint.create so test runs autonomously without requiring live DB writes
  const originalCreate = Complaint.create;
  Complaint.create = async (doc) => {
    return {
      _id: '507f1f77bcf86cd799439011',
      ...doc,
      createdAt: new Date(),
    };
  };

  const app = express();
  app.use(helmet());

  // Static /uploads route with Cross-Origin-Resource-Policy header
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.join(__dirname, 'uploads'))
  );

  // Mock authentication middleware to populate req.user
  app.use((req, res, next) => {
    req.user = {
      id: 'user_resident_123',
      role: 'Resident',
      societyId: 'society_tenant_456',
      unitNumber: 'A-101',
    };
    next();
  });

  // Complaint creation route with upload middleware and Zod schema
  app.post(
    '/api/complaints',
    uploadComplaintImage,
    validate(createComplaintSchema),
    createComplaint
  );

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // ─── Test 1: Successful Image Upload + Complaint Creation ─────────────
    console.log('--- Test Group 1: Successful Image Upload ---');
    {
      const formData = new FormData();
      formData.append('title', 'Elevator Beeping Continuously');
      formData.append('description', 'The elevator in Tower A has an alarm sound.');

      // 100-byte dummy PNG
      const dummyPng = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
        type: 'image/png',
      });
      formData.append('image', dummyPng, 'elevator-noise.png');

      const res = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      assert(res.status === 201, 'Complaint created successfully with HTTP 201');
      assert(data.complaint.title === 'Elevator Beeping Continuously', 'Title is correctly saved');
      assert(
        data.complaint.imageUrl && data.complaint.imageUrl.startsWith('/uploads/complaints/'),
        'imageUrl starts with /uploads/complaints/'
      );
      assert(
        data.complaint.imageUrl.endsWith('.png'),
        'Randomized filename preserves .png extension'
      );

      // Verify file was physically written to disk
      const savedFilePath = path.join(__dirname, data.complaint.imageUrl);
      assert(fs.existsSync(savedFilePath), 'Uploaded file exists on disk in backend/uploads/complaints/');

      // Clean up uploaded test file
      if (fs.existsSync(savedFilePath)) {
        fs.unlinkSync(savedFilePath);
      }
    }

    // ─── Test 2: Complaint Creation with No Image (Optional Image) ─────────
    console.log('\n--- Test Group 2: Complaint Without Image ---');
    {
      const formData = new FormData();
      formData.append('title', 'Streetlight Flickering');
      formData.append('description', 'Light outside main gate flickers at night.');

      const res = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      assert(res.status === 201, 'Complaint without image created with HTTP 201');
      assert(data.complaint.imageUrl === null, 'imageUrl is set to null when no image is uploaded');
      assert(data.complaint.flatNo === 'A-101', 'Resident flat number is correctly attached');
    }

    // ─── Test 3: Wrong MIME Type Rejection ─────────────────────────────────
    console.log('\n--- Test Group 3: Invalid MIME Type Rejection ---');
    {
      const formData = new FormData();
      formData.append('title', 'Water Issue');
      formData.append('description', 'Water pressure low in kitchen.');

      // Text file masquerading as attachment
      const textBlob = new Blob(['This is a text document, not an image'], {
        type: 'text/plain',
      });
      formData.append('image', textBlob, 'notes.txt');

      const res = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      assert(res.status === 400, 'Invalid file type rejected with HTTP 400');
      assert(data.success === false, 'Error response includes success: false');
      assert(
        data.error === 'INVALID_FILE_TYPE',
        'Returns standardized error code INVALID_FILE_TYPE'
      );
      assert(
        data.message.includes('Only JPEG, PNG, and WebP images are allowed'),
        'Descriptive error message explains allowed image formats'
      );
    }

    // ─── Test 4: Oversized File Rejection (>5MB) ───────────────────────────
    console.log('\n--- Test Group 4: Oversized File Rejection (>5MB) ---');
    {
      const formData = new FormData();
      formData.append('title', 'Heavy Attachment Test');
      formData.append('description', 'Testing 5MB limit.');

      // 5.5 MB dummy buffer
      const largeBuffer = new Uint8Array(5.5 * 1024 * 1024);
      const largeBlob = new Blob([largeBuffer], { type: 'image/jpeg' });
      formData.append('image', largeBlob, 'heavy-photo.jpg');

      const res = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      assert(res.status === 400, 'Oversized file (>5MB) rejected with HTTP 400');
      assert(data.success === false, 'Error response includes success: false');
      assert(
        data.error === 'FILE_TOO_LARGE',
        'Returns standardized error code FILE_TOO_LARGE'
      );
      assert(
        data.message.includes('File size exceeds maximum limit of 5MB'),
        'Descriptive error message specifies 5MB limit'
      );
    }

    // ─── Test 5: Static /uploads Route & CORP Header ───────────────────────
    console.log('\n--- Test Group 5: Static /uploads Cross-Origin-Resource-Policy ---');
    {
      // Create a temporary dummy file in uploads
      const testFile = path.join(__dirname, 'uploads', 'test-corp.txt');
      fs.writeFileSync(testFile, 'CORP check content');

      const res = await fetch(`${baseUrl}/uploads/test-corp.txt`);
      const corpHeader = res.headers.get('cross-origin-resource-policy');

      assert(res.status === 200, 'Static file served successfully with HTTP 200');
      assert(
        corpHeader === 'cross-origin',
        'Cross-Origin-Resource-Policy is set to cross-origin for static assets'
      );

      // Clean up test file
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  } finally {
    // Restore Complaint.create stub
    Complaint.create = originalCreate;
    server.close();
  }

  console.log('\n============================================================');
  console.log(`TOTAL PHASE 10 TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log(`SUCCESS RATE: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
