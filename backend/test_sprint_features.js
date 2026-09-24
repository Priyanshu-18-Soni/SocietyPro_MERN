const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function runSprintTests() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING SPRINT 5 ARCHITECTURAL FEATURES');
  console.log('======================================================\n');
  const ts = Date.now();

  try {
    // 1. Setup Society and Owner
    console.log('--- 1. Setup Society & Owner ---');
    const ownerRes = await request('POST', '/api/auth/register-owner', {
      name: `Sprint Owner ${ts}`,
      email: `owner_${ts}@sprint.com`,
      password: 'Password123!',
      societyName: `Sprint Heights ${ts}`,
      address: '123 Sprint Blvd',
      city: 'Bangalore',
      registrationNumber: `REG-SP-${ts}`,
    });
    assert(ownerRes.status === 201, 'Owner registered successfully');
    const ownerToken = ownerRes.data.token;
    const societyCode = ownerRes.data.society.societyCode;

    // 2. Register Resident 1 (Pending)
    console.log('\n--- 2. Register Resident 1 & Test Check-Status ---');
    const res1Res = await request('POST', '/api/auth/register-resident', {
      name: `Resident One ${ts}`,
      email: `res1_${ts}@sprint.com`,
      password: 'Password123!',
      societyCode: societyCode,
      unitNumber: 'B-201',
    });
    assert(res1Res.status === 201, 'Resident 1 registered');
    const res1PendingToken = res1Res.data.token;
    const res1Id = res1Res.data.user.id;

    // Call /api/auth/check-status before approval
    const checkBeforeApprove = await request('GET', '/api/auth/check-status', null, res1PendingToken);
    assert(checkBeforeApprove.status === 200, 'GET /api/auth/check-status returned 200');
    assert(checkBeforeApprove.data.status === 'pending', "Status is 'pending'");
    assert(checkBeforeApprove.data.token === null, 'No new token issued while pending');

    // Owner approves resident 1
    const approveRes = await request('PATCH', `/api/users/residents/${res1Id}/approve`, {}, ownerToken);
    assert(approveRes.status === 200, 'Owner approved resident 1');

    // Call /api/auth/check-status after approval with the old pending token
    const checkAfterApprove = await request('GET', '/api/auth/check-status', null, res1PendingToken);
    assert(checkAfterApprove.status === 200, 'check-status after approval returned 200');
    assert(checkAfterApprove.data.status === 'active', "Status transitioned to 'active'");
    assert(typeof checkAfterApprove.data.token === 'string', 'Fresh active JWT token generated');
    const res1ActiveToken = checkAfterApprove.data.token;

    // 3. Test Automated Rate Engine (Auto-compute in generateBill)
    console.log('\n--- 3. Automated Rate Engine & Bulk Billing ---');
    // Generate bill without amount -> auto-computes:
    // Default User: billingType: 'fixed', fixedRate: 2500, parkingCharges: 300, waterCharges: 200 -> total 3000 INR -> 300000 Paise
    const autoBillRes = await request(
      'POST',
      '/api/payments/generate-bill',
      {
        residentId: res1Id,
        unitNumber: 'B-201',
        month: `January ${ts}`,
        dueDate: '2026-01-20',
      },
      ownerToken
    );
    assert(autoBillRes.status === 201, 'generateBill with no manual amount returned 201');
    assert(autoBillRes.data.bill?.amount === 300000, 'Auto-computed amount equals 300000 Paise (₹3000)');

    // Register Resident 2 and approve
    const res2Res = await request('POST', '/api/auth/register-resident', {
      name: `Resident Two ${ts}`,
      email: `res2_${ts}@sprint.com`,
      password: 'Password123!',
      societyCode: societyCode,
      unitNumber: 'B-202',
    });
    const res2Id = res2Res.data.user.id;
    await request('PATCH', `/api/users/residents/${res2Id}/approve`, {}, ownerToken);

    // Test Bulk Bill Generation with dynamic calculation
    const bulkRes = await request(
      'POST',
      '/api/payments/generate-bulk-bills',
      {
        month: `February ${ts}`,
        dueDate: '2026-02-15',
      },
      ownerToken
    );
    assert(bulkRes.status === 201, 'generateBulkBills with dynamic calculation returned 201');
    assert(bulkRes.data.totalCreated === 2, '2 bulk bills generated dynamically for active residents');

    // 4. Test Grievance Redressal V2 (Upvote Toggle & User ObjectIds)
    console.log('\n--- 4. Grievance Upvote Toggle & Verdict ---');
    const complaintRes = await request(
      'POST',
      '/api/complaints',
      {
        title: 'Elevator Maintenance Required',
        description: 'Elevator B making noise',
        flatNo: 'B-201',
      },
      res1ActiveToken
    );
    assert(complaintRes.status === 201, 'Complaint ticket filed');
    const complaintId = complaintRes.data.complaint._id;

    // Upvote by Resident 2
    const upvote1 = await request('PATCH', `/api/complaints/${complaintId}/upvote`, {}, checkAfterApprove.data.token);
    assert(upvote1.status === 200, 'Resident upvoted complaint');
    assert(upvote1.data.complaint?.upvoteCount === 1, 'upvoteCount incremented to 1');
    assert(upvote1.data.complaint?.upvotedBy?.length === 1, 'upvotedBy contains 1 user ID');

    // Toggle upvote off (unvote)
    const upvote2 = await request('PATCH', `/api/complaints/${complaintId}/upvote`, {}, checkAfterApprove.data.token);
    assert(upvote2.status === 200, 'Resident removed upvote (toggle)');
    assert(upvote2.data.complaint?.upvoteCount === 0, 'upvoteCount decremented to 0');
    assert(upvote2.data.complaint?.upvotedBy?.length === 0, 'upvotedBy is now empty');

    // 5. Test Notice Pinning & Custom Sort Order
    console.log('\n--- 5. Notice Pinning & Custom Tri-Level Sort ---');
    // Notice 1: Priority notice
    const n1 = await request('POST', '/api/notices', { title: 'Water Tank Clean', body: 'Cleaning tomorrow', isPriority: true }, ownerToken);
    // Notice 2: Normal notice
    const n2 = await request('POST', '/api/notices', { title: 'Garden Trimming', body: 'Trimming Saturday', isPriority: false }, ownerToken);
    // Notice 3: Another normal notice that will be pinned by Resident 1
    const n3 = await request('POST', '/api/notices', { title: 'Gym Hours', body: 'Gym open from 6am', isPriority: false }, ownerToken);

    // Resident 1 pins Notice 3
    const pinRes = await request('PATCH', `/api/notices/${n3.data.notice._id}/pin`, {}, res1ActiveToken);
    assert(pinRes.status === 200, 'Resident 1 pinned notice 3');
    assert(pinRes.data.isPinned === true, 'isPinned is true');

    // Fetch notices as Resident 1: Order should be Notice 1 (Priority) -> Notice 3 (Pinned) -> Notice 2 (Normal)
    const noticesList = await request('GET', '/api/notices', null, res1ActiveToken);
    assert(noticesList.status === 200, 'GET /api/notices returned 200');
    const titles = noticesList.data.notices.map(n => n.title);
    console.log('  ℹ️ Notice Sort Order:', titles);
    assert(titles[0] === 'Water Tank Clean', 'First notice is Priority');
    assert(titles[1] === 'Gym Hours', 'Second notice is Personally Pinned');
    assert(titles[2] === 'Garden Trimming', 'Third notice is Regular Recent');

    console.log('\n======================================================');
    console.log(`📊 SPRINT FEATURE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

async function main() {
  require('./server');
  await new Promise(r => setTimeout(r, 3000));
  await runSprintTests();
}

main();
