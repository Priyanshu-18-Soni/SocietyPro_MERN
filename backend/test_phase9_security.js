const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
if (!process.env.RAZORPAY_KEY_ID) process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_id';
if (!process.env.RAZORPAY_KEY_SECRET) process.env.RAZORPAY_KEY_SECRET = 'rzp_test_mock_secret';

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validate = require('./middleware/validate');
const {
  registerOwnerSchema,
  registerResidentSchema,
  loginSchema,
  recordExpenseSchema,
  createComplaintSchema,
  createNoticeSchema,
} = require('./validations/schemas');
const { handleRazorpayWebhook } = require('./controllers/paymentController');

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

async function runTests() {
  console.log('============================================================');
  console.log('RUNNING PHASE 9 SECURITY HARDENING TEST SUITE');
  console.log('============================================================\n');

  // ─── Test 1: Helmet Secure HTTP Headers ─────────────────────────
  console.log('--- Test Group 1: Helmet Global Security Headers ---');
  {
    const app = express();
    app.use(helmet());
    app.get('/test-headers', (req, res) => res.json({ status: 'ok' }));

    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/test-headers`);
    const headers = res.headers;

    assert(headers.get('x-content-type-options') === 'nosniff', 'Helmet sets X-Content-Type-Options: nosniff');
    assert(headers.get('x-frame-options') === 'SAMEORIGIN' || headers.has('x-frame-options'), 'Helmet sets X-Frame-Options');
    assert(headers.has('x-dns-prefetch-control'), 'Helmet sets X-DNS-Prefetch-Control');
    assert(headers.get('x-download-options') === 'noopen', 'Helmet sets X-Download-Options');

    server.close();
  }

  // ─── Test 2: Zod Validation Middleware ──────────────────────────
  console.log('\n--- Test Group 2: Zod Validation Schemas & Error Contract ---');
  {
    const app = express();
    app.use(express.json());

    app.post('/test/register-owner', validate(registerOwnerSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    app.post('/test/login', validate(loginSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    app.post('/test/expense', validate(recordExpenseSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    app.post('/test/complaint', validate(createComplaintSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    app.post('/test/notice', validate(createNoticeSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    const server = app.listen(0);
    const port = server.address().port;

    // 2.1 Missing fields on register-owner
    {
      const res = await fetch(`http://localhost:${port}/test/register-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pushkar' }),
      });
      const data = await res.json();
      assert(res.status === 400, 'Zod blocks incomplete register-owner request with HTTP 400');
      assert(data.success === false, 'Error response includes success: false');
      assert(data.error === 'VALIDATION_FAILED', 'Error code is VALIDATION_FAILED');
      assert(data.message.includes('Validation failed'), 'Error message contains Validation failed prefix');
    }

    // 2.2 Invalid email format on login
    {
      const res = await fetch(`http://localhost:${port}/test/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'secretpassword' }),
      });
      const data = await res.json();
      assert(res.status === 400, 'Zod blocks invalid email on login with HTTP 400');
      assert(data.error === 'VALIDATION_FAILED', 'Error code is VALIDATION_FAILED');
      assert(data.message.includes('Invalid email format'), 'Detailed Zod error message present');
    }

    // 2.3 Invalid paymentMethod on expense
    {
      const res = await fetch(`http://localhost:${port}/test/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'Repairs',
          amount: 500,
          paymentMethod: 'bitcoin', // invalid enum
          description: 'Elevator maintenance',
        }),
      });
      const data = await res.json();
      assert(res.status === 400, 'Zod blocks invalid paymentMethod enum with HTTP 400');
      assert(data.error === 'VALIDATION_FAILED', 'Error code is VALIDATION_FAILED');
    }

    // 2.4 Valid complaint payload passes
    {
      const res = await fetch(`http://localhost:${port}/test/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Water Leakage',
          description: 'Pipe leaking in block A corridor',
        }),
      });
      const data = await res.json();
      assert(res.status === 200, 'Valid complaint passes validation middleware');
      assert(data.success === true, 'Success response returned');
    }

    // 2.5 Valid notice payload passes
    {
      const res = await fetch(`http://localhost:${port}/test/notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AGM Notice',
          body: 'Annual General Meeting this Sunday at 10 AM',
          isPriority: true,
        }),
      });
      const data = await res.json();
      assert(res.status === 200, 'Valid notice passes validation middleware');
      assert(data.data.title === 'AGM Notice', 'Trimmed and sanitized payload passed to controller');
    }

    server.close();
  }

  // ─── Test 3: Webhook Secret Separation ──────────────────────────
  console.log('\n--- Test Group 3: Webhook Secret Strict Separation ---');
  {
    const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // Simulate RAZORPAY_WEBHOOK_SECRET missing even if RAZORPAY_KEY_SECRET exists
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_KEY_SECRET = 'rzp_key_secret_dummy_123';

    let statusCode = null;
    let responseData = null;

    const mockReq = {
      headers: { 'x-razorpay-signature': 'abc123dummy' },
      body: { event: 'payment.captured' },
    };
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    await handleRazorpayWebhook(mockReq, mockRes);

    assert(statusCode === 500, 'Webhook returns HTTP 500 when RAZORPAY_WEBHOOK_SECRET is unset');
    assert(responseData.error === 'WEBHOOK_SECRET_MISSING', 'Returns WEBHOOK_SECRET_MISSING error code');
    assert(responseData.success === false, 'Returns success: false');

    // Restore env vars
    if (originalWebhookSecret) process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;
    if (originalKeySecret) process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
  }

  // ─── Test 4: Rate Limiting Enforcement ──────────────────────────
  console.log('\n--- Test Group 4: Rate Limiter Enforcement & Shape ---');
  {
    const app = express();
    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2, // 2 requests allowed for testing
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many attempts. Please try again after 15 minutes.',
        error: 'RATE_LIMIT_EXCEEDED',
      },
    });

    app.post('/api/auth/test-limit', testLimiter, (req, res) => res.json({ success: true }));

    const server = app.listen(0);
    const port = server.address().port;

    const res1 = await fetch(`http://localhost:${port}/api/auth/test-limit`, { method: 'POST' });
    const res2 = await fetch(`http://localhost:${port}/api/auth/test-limit`, { method: 'POST' });
    const res3 = await fetch(`http://localhost:${port}/api/auth/test-limit`, { method: 'POST' });

    assert(res1.status === 200, 'Request 1 under limit succeeds (HTTP 200)');
    assert(res2.status === 200, 'Request 2 at limit succeeds (HTTP 200)');
    assert(res3.status === 429, 'Request 3 exceeding limit blocked with HTTP 429');

    const data3 = await res3.json();
    assert(data3.success === false, 'Rate limit error includes success: false');
    assert(data3.error === 'RATE_LIMIT_EXCEEDED', 'Rate limit error code is RATE_LIMIT_EXCEEDED');

    server.close();
  }

  console.log('\n============================================================');
  console.log(`TOTAL PHASE 9 TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log(`SUCCESS RATE: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
