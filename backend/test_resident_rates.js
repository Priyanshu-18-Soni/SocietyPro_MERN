const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  const ts = Date.now();
  console.log('--- Setting up Society 1, Owner 1, Resident 1, Society 2, Resident 2 ---');

  // Register Owner 1
  const owner1Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-owner',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Owner 1',
      email: `owner1_${ts}@test.com`,
      password: 'Password123!',
      societyName: `Society1_${ts}`,
      address: '101 First Ave',
      city: 'Mumbai',
      registrationNumber: 'REG-S1',
    }
  );
  const owner1Token = owner1Res.data.token;
  const s1Code = owner1Res.data.society.societyCode;

  // Set default rates for Society 1
  await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/society/rates/default',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
    },
    {
      rateItems: [
        { name: 'Security', amount: 350, gstApplicable: true },
        { name: 'Water Charges', amount: 500, gstApplicable: false },
        { name: 'Maintenance', amount: 2000, gstApplicable: false },
      ],
    }
  );

  // Register Resident 1 in Society 1
  const res1Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-resident',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Resident One',
      email: `res1_${ts}@test.com`,
      password: 'Password123!',
      societyCode: s1Code,
      unitNumber: 'A-101',
    }
  );
  const resident1Token = res1Res.data.token;
  const resident1Id = res1Res.data.user.id;

  // Register Owner 2 and Resident 2 in Society 2
  const owner2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-owner',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Owner 2',
      email: `owner2_${ts}@test.com`,
      password: 'Password123!',
      societyName: `Society2_${ts}`,
      address: '202 Second Ave',
      city: 'Delhi',
      registrationNumber: 'REG-S2',
    }
  );
  const s2Code = owner2Res.data.society.societyCode;

  const res2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register-resident',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Resident Two',
      email: `res2_${ts}@test.com`,
      password: 'Password123!',
      societyCode: s2Code,
      unitNumber: 'B-202',
    }
  );
  const resident2Token = res2Res.data.token;

  console.log('Setup complete.\n');

  console.log('================================================================');
  console.log('TEST 6a: GET /api/users/:id/rate as SocietyOwner BEFORE custom rate');
  console.log('================================================================');
  const test6a = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${resident1Id}/rate`,
    method: 'GET',
    headers: { Authorization: `Bearer ${owner1Token}` },
  });
  console.log(`Status: ${test6a.status}`);
  console.log('Response:', JSON.stringify(test6a.data, null, 2));

  console.log('\n================================================================');
  console.log('TEST 6b: PATCH /api/users/:id/rate as SocietyOwner with custom items');
  console.log('================================================================');
  const customItemsPayload = {
    rateItems: [
      { name: 'Security', amount: 450, gstApplicable: true },
      { name: 'Water Charges', amount: 600, gstApplicable: false },
      { name: 'Maintenance', amount: 2500, gstApplicable: false },
    ],
  };
  const test6b = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/users/${resident1Id}/rate`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
    },
    customItemsPayload
  );
  console.log(`Status: ${test6b.status}`);
  console.log('Response:', JSON.stringify(test6b.data, null, 2));

  console.log('\n================================================================');
  console.log('TEST 6c: GET /api/users/:id/rate again as SocietyOwner');
  console.log('================================================================');
  const test6c = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${resident1Id}/rate`,
    method: 'GET',
    headers: { Authorization: `Bearer ${owner1Token}` },
  });
  console.log(`Status: ${test6c.status}`);
  console.log('Response:', JSON.stringify(test6c.data, null, 2));

  console.log('\n================================================================');
  console.log('TEST 6d: GET /api/users/:id/rate as Resident themselves');
  console.log('================================================================');
  const test6d = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${resident1Id}/rate`,
    method: 'GET',
    headers: { Authorization: `Bearer ${resident1Token}` },
  });
  console.log(`Status: ${test6d.status}`);
  console.log('Response:', JSON.stringify(test6d.data, null, 2));

  console.log('\n================================================================');
  console.log('TEST 6e: GET /api/users/:id/rate as Resident from DIFFERENT society');
  console.log('================================================================');
  const test6e = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${resident1Id}/rate`,
    method: 'GET',
    headers: { Authorization: `Bearer ${resident2Token}` },
  });
  console.log(`Status: ${test6e.status}`);
  console.log('Response:', JSON.stringify(test6e.data, null, 2));

  console.log('\n================================================================');
  console.log('TEST 6f: PATCH /api/users/:id/rate with empty array (reset) & verify GET');
  console.log('================================================================');
  const test6fPatch = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/users/${resident1Id}/rate`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
    },
    { rateItems: [] }
  );
  console.log(`PATCH Status: ${test6fPatch.status}`);
  console.log('PATCH Response:', JSON.stringify(test6fPatch.data, null, 2));

  const test6fGet = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${resident1Id}/rate`,
    method: 'GET',
    headers: { Authorization: `Bearer ${owner1Token}` },
  });
  console.log(`Follow-up GET Status: ${test6fGet.status}`);
  console.log('Follow-up GET Response:', JSON.stringify(test6fGet.data, null, 2));
}

runTests().catch(console.error);
