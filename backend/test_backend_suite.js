const crypto = require('crypto');
const http = require('http');

const BASE_URL = 'http://localhost:5000';
const WEBHOOK_SECRET = 'whsec_societypro_test_secret_key_2026';

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

async function request(method, path, body = null, token = null, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data, headers: res.headers };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🚀 SOCIETYPRO BACKEND AUTOMATED INTEGRATION SUITE');
  console.log('======================================================\n');

  const ts = Date.now();

  try {
    // ----------------------------------------------------
    // Scenario A: Register Owner 1 & Society 1
    // ----------------------------------------------------
    console.log('--- SCENARIO A: Register Owner & Generate Society ---');
    const owner1Res = await request('POST', '/api/auth/register-owner', {
      name: `Owner Alpha ${ts}`,
      email: `owner_${ts}@alpha.com`,
      password: 'Password123!',
      societyName: `Royal Palms ${ts}`,
      address: 'Plot 42, Palm Boulevard',
      city: 'Mumbai',
      registrationNumber: `REG-${ts}`,
    });

    assert(owner1Res.status === 201, 'Owner registration returned HTTP 201');
    assert(owner1Res.data.token, 'Owner JWT token issued');
    assert(owner1Res.data.society?.societyCode, 'Society join code generated');

    const owner1Token = owner1Res.data.token;
    const society1Code = owner1Res.data.society.societyCode;
    const society1Id = owner1Res.data.society.id;
    console.log(`  ℹ️ Society 1 Code: ${society1Code}, Society ID: ${society1Id}`);

    // ----------------------------------------------------
    // Scenario B: Register Resident -> Assert status is 'pending'
    // ----------------------------------------------------
    console.log('\n--- SCENARIO B: Register Resident with Status "pending" ---');
    const res1Res = await request('POST', '/api/auth/register-resident', {
      name: 'Resident John Doe',
      email: `resident_${ts}@alpha.com`,
      password: 'Password123!',
      societyCode: society1Code,
      unitNumber: 'A-101',
    });

    assert(res1Res.status === 201, 'Resident registration returned HTTP 201');
    assert(res1Res.data.user?.status === 'pending', "Newly registered resident has status: 'pending'");
    const res1Token = res1Res.data.token;
    const res1Id = res1Res.data.user?.id;
    console.log(`  ℹ️ Resident 1 ID: ${res1Id}, Status: ${res1Res.data.user?.status}`);

    // ----------------------------------------------------
    // Scenario C: Gatekeeper Block -> Pending resident gets 403 ACCOUNT_INACTIVE
    // ----------------------------------------------------
    console.log('\n--- SCENARIO C: Gatekeeper Access Enforcement (403 Expected) ---');
    const complaintsBlockRes = await request('GET', '/api/complaints', null, res1Token);
    assert(complaintsBlockRes.status === 403, 'Pending resident blocked from complaints with HTTP 403');
    assert(complaintsBlockRes.data?.code === 'ACCOUNT_INACTIVE', "Response returns error code 'ACCOUNT_INACTIVE'");

    const noticesBlockRes = await request('GET', '/api/notices', null, res1Token);
    assert(noticesBlockRes.status === 403, 'Pending resident blocked from notices with HTTP 403');

    // ----------------------------------------------------
    // Scenario D: Owner Approves Resident -> Access Granted
    // ----------------------------------------------------
    console.log('\n--- SCENARIO D: Resident Moderation & Approval ---');
    const pendingListRes = await request('GET', '/api/users/residents/pending', null, owner1Token);
    assert(pendingListRes.status === 200, 'Owner can retrieve pending resident roster');
    const foundPending = pendingListRes.data.pendingResidents?.some((r) => r._id === res1Id);
    assert(foundPending, 'Resident 1 present in pending queue');

    const approveRes = await request('PATCH', `/api/users/residents/${res1Id}/approve`, {}, owner1Token);
    assert(approveRes.status === 200, 'Resident approved successfully with HTTP 200');
    assert(approveRes.data.resident?.status === 'active', "Resident status transitioned to 'active'");

    // Re-test complaints access with now-approved resident
    const complaintsAllowedRes = await request('GET', '/api/complaints', null, res1Token);
    assert(complaintsAllowedRes.status === 200, 'Approved resident granted access to /api/complaints (HTTP 200)');

    // ----------------------------------------------------
    // Scenario E: Grievance Redressal (Complaints Engine)
    // ----------------------------------------------------
    console.log('\n--- SCENARIO E: Grievance Redressal & Upvoting ---');
    const createComplaintRes = await request(
      'POST',
      '/api/complaints',
      {
        title: 'Water pipe leakage in Block A',
        description: 'Continuous leaking from overhead tank near A-101 hallway',
        flatNo: 'A-101',
      },
      res1Token
    );

    assert(createComplaintRes.status === 201, 'Complaint ticket filed with HTTP 201');
    const complaint = createComplaintRes.data.complaint;
    const complaintId = complaint?._id;
    assert(complaint?.affectedFlats?.length === 1, 'Initial ticket has 1 affected flat');
    assert(complaint?.status === 'open', 'Initial ticket status is open');

    // Register Resident 2, approve, and upvote complaint
    const res2Res = await request('POST', '/api/auth/register-resident', {
      name: 'Resident Jane Smith',
      email: `resident2_${ts}@alpha.com`,
      password: 'Password123!',
      societyCode: society1Code,
      unitNumber: 'A-102',
    });
    const res2Token = res2Res.data.token;
    const res2Id = res2Res.data.user?.id;
    await request('PATCH', `/api/users/residents/${res2Id}/approve`, {}, owner1Token);

    const upvoteRes = await request('PATCH', `/api/complaints/${complaintId}/upvote`, {}, res2Token);
    assert(upvoteRes.status === 200, 'Resident 2 successfully upvoted complaint');
    assert(upvoteRes.data.complaint?.affectedFlats?.length === 2, 'affectedFlats array length incremented to 2');

    // Owner changes status to in_progress
    const statusUpdateRes = await request(
      'PATCH',
      `/api/complaints/${complaintId}/status`,
      { status: 'in_progress' },
      owner1Token
    );
    assert(statusUpdateRes.status === 200, 'Owner updated complaint status to in_progress');
    assert(statusUpdateRes.data.complaint?.status === 'in_progress', 'Status verified as in_progress');

    // Ticket creator submits verdict confirmed -> sets status to closed
    const verdictRes = await request(
      'PATCH',
      `/api/complaints/${complaintId}/verdict`,
      { verdict: 'confirmed' },
      res1Token
    );
    assert(verdictRes.status === 200, 'Ticket creator submitted confirmed verdict');
    assert(verdictRes.data.complaint?.status === 'closed', 'Verdict confirmed automatically closed ticket');

    // Non-creator resident attempts verdict submission -> should be 403
    const unauthorizedVerdict = await request(
      'PATCH',
      `/api/complaints/${complaintId}/verdict`,
      { verdict: 'reopened' },
      res2Token
    );
    assert(unauthorizedVerdict.status === 403, 'Non-creator forbidden from submitting verdict (HTTP 403)');

    // ----------------------------------------------------
    // Scenario F: Notice Board Engine
    // ----------------------------------------------------
    console.log('\n--- SCENARIO F: Notice Board & Priority Pinned Alerts ---');
    const createNoticeRes = await request(
      'POST',
      '/api/notices',
      {
        title: 'Quarterly Society General Body Meeting',
        body: 'Meeting scheduled for Sunday 11 AM in the central clubhouse.',
        isPriority: true,
      },
      owner1Token
    );
    assert(createNoticeRes.status === 201, 'Notice broadcasted successfully with HTTP 201');
    const noticeId = createNoticeRes.data.notice?._id;

    // Resident 1 toggles pin
    const pinRes = await request('PATCH', `/api/notices/${noticeId}/pin`, {}, res1Token);
    assert(pinRes.status === 200, 'Resident successfully pinned notice');
    assert(pinRes.data.isPinned === true, 'Notice pin state is true');
    assert(pinRes.data.notice?.pinnedBy?.includes(res1Id), 'Resident ID present in pinnedBy array');

    // Get notices -> verify priority sorting
    const getNoticesRes = await request('GET', '/api/notices', null, res1Token);
    assert(getNoticesRes.status === 200, 'Fetched notices list with HTTP 200');
    assert(getNoticesRes.data.notices?.length >= 1, 'At least 1 notice in response');

    // ----------------------------------------------------
    // Scenario G: Treasury Ledger & Expenses
    // ----------------------------------------------------
    console.log('\n--- SCENARIO G: Treasury Ledger & Expense Bookkeeping ---');
    const expenseRes = await request(
      'POST',
      '/api/finances/expenses',
      {
        category: 'Generator Maintenance',
        amount: 3500, // ₹3500
        paymentMethod: 'bank_transfer',
        description: 'Diesel refilling and filter servicing',
      },
      owner1Token
    );
    assert(expenseRes.status === 201, 'Expense recorded in ledger with HTTP 201');
    assert(expenseRes.data.expense?.amountInPaise === 350000, 'Expense amount stored strictly in Paise (350000)');

    const metricsRes = await request('GET', '/api/finances/metrics', null, owner1Token);
    assert(metricsRes.status === 200, 'Financial metrics fetched successfully');
    assert(metricsRes.data.metrics?.totalExpense === 3500, 'Metrics reflects ₹3500 total expense');
    assert(metricsRes.data.metrics?.totalExpenseInPaise === 350000, 'Metrics reflects 350000 Paise total expense');

    // ----------------------------------------------------
    // Scenario H: Cross-Tenant Isolation Enforcement
    // ----------------------------------------------------
    console.log('\n--- SCENARIO H: Cross-Tenant Isolation Boundaries ---');
    const owner2Res = await request('POST', '/api/auth/register-owner', {
      name: `Owner Beta ${ts}`,
      email: `owner2_${ts}@beta.com`,
      password: 'Password123!',
      societyName: `Silver Woods ${ts}`,
      address: 'Sector 9, Woods Way',
      city: 'Pune',
      registrationNumber: `REG-B-${ts}`,
    });
    const owner2Token = owner2Res.data.token;

    // Tenant B attempts to update Tenant A's complaint status -> 404
    const crossTenantComplaint = await request(
      'PATCH',
      `/api/complaints/${complaintId}/status`,
      { status: 'in_progress' },
      owner2Token
    );
    assert(crossTenantComplaint.status === 404, "Cross-tenant complaint mutation returns 404 'Resource not found'");

    // Tenant B attempts to delete Tenant A's notice -> 404
    const crossTenantNotice = await request('DELETE', `/api/notices/${noticeId}`, null, owner2Token);
    assert(crossTenantNotice.status === 404, "Cross-tenant notice deletion returns 404 'Resource not found'");

    // Tenant B attempts to approve Tenant A's resident -> 404
    const crossTenantApprove = await request(
      'PATCH',
      `/api/users/residents/${res1Id}/approve`,
      {},
      owner2Token
    );
    assert(crossTenantApprove.status === 404, "Cross-tenant resident moderation returns 404 'Resource not found'");

    // ----------------------------------------------------
    // Scenario I: Razorpay Webhook Ingestion & Auto-Ledger Credit
    // ----------------------------------------------------
    console.log('\n--- SCENARIO I: Webhook Ingestion & Automatic Income Credit ---');
    // Generate bill for Resident 1
    const generateBillRes = await request(
      'POST',
      '/api/payments/generate-bill',
      {
        residentId: res1Id,
        amount: 2000, // ₹2000 = 200000 paise
        unitNumber: 'A-101',
        month: 'November 2026',
        dueDate: '2026-11-15',
      },
      owner1Token
    );
    assert(generateBillRes.status === 201, 'Bill generated for Resident 1');
    const billId = generateBillRes.data.bill?.id;

    // Resident 1 creates order for the bill
    const orderRes = await request('POST', '/api/payments/create-order', { billId }, res1Token);
    assert(orderRes.status === 200, 'Razorpay order created for bill');
    const orderId = orderRes.data.orderId;
    console.log(`  ℹ️ Generated Order ID: ${orderId}`);

    // Build webhook payload
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_sim_${Date.now()}`,
            order_id: orderId,
            amount: 200000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest('hex');

    const webhookRes = await request(
      'POST',
      '/api/payments/webhook',
      webhookPayload,
      null,
      { 'x-razorpay-signature': signature }
    );
    assert(webhookRes.status === 200, 'Webhook processed successfully with HTTP 200');

    // Verify financial metrics now includes income from this captured bill
    const updatedMetricsRes = await request('GET', '/api/finances/metrics', null, owner1Token);
    assert(updatedMetricsRes.status === 200, 'Fetched updated treasury metrics');
    assert(
      updatedMetricsRes.data.metrics?.totalIncome === 2000,
      'Treasury metrics automatically credited with ₹2000 income from webhook'
    );
    assert(
      updatedMetricsRes.data.metrics?.netBalance === -1500, // 2000 - 3500 = -1500
      'Net balance computed correctly: ₹2000 income - ₹3500 expense = -₹1500'
    );

    console.log('\n======================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('======================================================\n');

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unhandled error during test execution:', err);
    process.exit(1);
  }
}

// Ensure backend is running or start it
async function main() {
  try {
    const health = await fetch(`${BASE_URL}/`);
    if (health.ok) {
      console.log('✅ Server already running on port 5000. Running tests...');
      await runAllTests();
      return;
    }
  } catch {
    console.log('⚠️ Server not detected on port 5000. Launching in-process backend server...');
  }

  // Require server to start it
  require('./server');
  // Wait 3 seconds for MongoDB connection to initialize
  await sleep(3000);
  await runAllTests();
}

main();
