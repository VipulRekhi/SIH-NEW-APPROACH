import app from '../server.js';
import http from 'http';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099';

  console.log('--- STARTING PHASE 1 BACKEND VERIFICATION TESTS ---');
  let failures = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      failures++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData: any = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'healthy', 'GET /api/health returns healthy');

    // 2. Register technician
    const testEmail = `tech_${Date.now()}@metrology.gov.in`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Metrologist',
        email: testEmail,
        password: 'Password123!',
        confirm_password: 'Password123!'
      })
    });
    const regData: any = await regRes.json();
    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(!!regData.data?.token, 'Registration returns JWT token');
    assert(regData.data?.user?.role_name === 'technician', 'Registered user gets technician role');
    assert(!regData.data?.user?.password_hash, 'Password hash is NOT exposed in response');

    const technicianToken = regData.data.token;

    // 3. Duplicate email registration
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Duplicate Metrologist',
        email: testEmail,
        password: 'Password123!',
        confirm_password: 'Password123!'
      })
    });
    const dupData: any = await dupRes.json();
    assert(dupRes.status === 409 && dupData.error?.code === 'EMAIL_EXISTS', 'Duplicate email rejected with 409 Conflict');

    // 4. Login with wrong password
    const wrongPwRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!'
      })
    });
    assert(wrongPwRes.status === 401, 'Wrong password rejected with 401 Unauthorized');

    // 5. Login with correct password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!'
      })
    });
    const loginData: any = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.data?.token, 'Valid login returns 200 with JWT');
    assert(!loginData.data?.user?.password_hash, 'Login response does not expose password hash');

    // 6. /api/auth/me with valid token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${technicianToken}` }
    });
    const meData: any = await meRes.json();
    assert(meRes.status === 200 && meData.data?.user?.email === testEmail, 'GET /api/auth/me succeeds with valid token');

    // 7. /api/auth/me with missing token
    const meNoTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(meNoTokenRes.status === 401, 'GET /api/auth/me rejected without token (401)');

    // 8. /api/auth/me with invalid token
    const meBadTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer fake.invalid.token' }
    });
    assert(meBadTokenRes.status === 401, 'GET /api/auth/me rejected with invalid token (401)');

    // 9. Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${technicianToken}` }
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200');

    // 10. Role authorization: Technician attempting admin-only POST /api/laboratories
    const adminActionRes = await fetch(`${baseUrl}/api/laboratories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${technicianToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Unauthorized Lab Creation' })
    });
    assert(adminActionRes.status === 403, 'Admin endpoint correctly forbids technician with 403 Forbidden');

    // 11. Placeholder endpoint /api/instruments returns 501
    const placeholderRes = await fetch(`${baseUrl}/api/instruments`);
    assert(placeholderRes.status === 501, 'Placeholder /api/instruments returns 501 Not Implemented');

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    server.close();
    console.log(`--- TEST RESULTS: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'} ---`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

runTests();
