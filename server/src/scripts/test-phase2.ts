import { OcrParser } from '../services/ocr/ocr.parser.js';

async function runPhase2Tests() {
  const baseUrl = 'http://localhost:5000';

  console.log('--- STARTING PHASE 2 INSTRUMENT & OCR VERIFICATION TESTS ---');
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
    // 1. Authenticate as admin
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@nawi.gov.in',
        password: 'Admin@123456'
      })
    });
    const loginData: any = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.data?.token, 'Login as admin succeeds');
    const adminToken = loginData.data.token;

    // 2. Check Seeded Instrument
    const listRes = await fetch(`${baseUrl}/api/instruments`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData: any = await listRes.json();
    assert(listRes.status === 200 && Array.isArray(listData.data?.instruments), 'GET /api/instruments returns array');
    const seeded = listData.data?.instruments.find((i: any) => i.serial_number === 'ABX93821');
    assert(!!seeded && seeded.manufacturer === 'ABC Weighing Systems', 'Seeded demo instrument ABX93821 exists');

    // 3. Create a new instrument
    const testSerial = `ES-${Date.now().toString().slice(-6)}`;
    const createRes = await fetch(`${baseUrl}/api/instruments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manufacturer: 'Essae-Teraoka',
        model_number: 'DS-852',
        serial_number: testSerial,
        instrument_type: 'Non-Automatic Weighing Instrument (Bench Scale)',
        accuracy_class: 'III',
        max_capacity: 15.0,
        min_capacity: 0.1,
        scale_interval: 0.005,
        verification_scale_interval: 0.005,
        unit: 'kg',
        notes: 'Verification test instrument'
      })
    });
    const createData: any = await createRes.json();
    assert(createRes.status === 201 && !!createData.data?.instrument?.id, 'POST /api/instruments creates record (201)');
    const createdId = createData.data?.instrument?.id;

    // 4. Validation: Invalid capacity (max < min) rejected
    const invalidCapRes = await fetch(`${baseUrl}/api/instruments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manufacturer: 'Essae-Teraoka',
        model_number: 'DS-852',
        serial_number: `INV-${Date.now()}`,
        instrument_type: 'Scale',
        accuracy_class: 'III',
        max_capacity: 5.0,
        min_capacity: 10.0, // Invalid: min > max
        scale_interval: 0.01,
        verification_scale_interval: 0.01,
        unit: 'kg'
      })
    });
    assert(invalidCapRes.status === 400, 'POST /api/instruments rejects min_capacity > max_capacity (400)');

    // 5. Duplicate serial in same laboratory rejected
    const dupRes = await fetch(`${baseUrl}/api/instruments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manufacturer: 'Essae-Teraoka',
        model_number: 'DS-852',
        serial_number: testSerial,
        instrument_type: 'Scale',
        accuracy_class: 'III',
        max_capacity: 15.0,
        min_capacity: 0.1,
        scale_interval: 0.005,
        verification_scale_interval: 0.005,
        unit: 'kg'
      })
    });
    assert(dupRes.status === 409, 'Duplicate serial number in same laboratory rejected with 409 Conflict');

    // 6. Get instrument by ID
    const getRes = await fetch(`${baseUrl}/api/instruments/${createdId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getData: any = await getRes.json();
    assert(getRes.status === 200 && getData.data?.instrument?.serial_number === testSerial, 'GET /api/instruments/:id returns correct instrument');

    // 7. Update instrument specifications
    const updateRes = await fetch(`${baseUrl}/api/instruments/${createdId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notes: 'Updated calibration notes during Phase 2 testing.'
      })
    });
    const updateData: any = await updateRes.json();
    assert(updateRes.status === 200 && updateData.data?.instrument?.notes?.includes('Updated calibration notes'), 'PUT /api/instruments/:id updates fields');

    // 8. Update instrument status
    const statusRes = await fetch(`${baseUrl}/api/instruments/${createdId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'UNDER_REVIEW' })
    });
    const statusData: any = await statusRes.json();
    assert(statusRes.status === 200 && statusData.data?.instrument?.status === 'UNDER_REVIEW', 'PATCH /api/instruments/:id/status updates status');

    // 9. Search instruments
    const searchRes = await fetch(`${baseUrl}/api/instruments?search=${testSerial}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData: any = await searchRes.json();
    assert(searchRes.status === 200 && searchData.data?.instruments?.length >= 1, 'Search query filters instrument by serial number');

    // 10. OCR Parser unit test
    const sampleOcrText = `
      METTLER TOLEDO
      Model: ME-204
      Serial No: 123456789
      Max 220 g
      Min 10 mg
      e = 1 mg
      d = 0.1 mg
      Accuracy Class I
    `;
    const parsed = OcrParser.parse(sampleOcrText, 85);
    assert(parsed.extracted.manufacturer === 'Mettler Toledo', 'OCR parser extracts manufacturer: Mettler Toledo');
    assert(parsed.extracted.model_number === 'ME-204', 'OCR parser extracts model: ME-204');
    assert(parsed.extracted.serial_number === '123456789', 'OCR parser extracts serial: 123456789');
    assert(parsed.extracted.max_capacity === 220, 'OCR parser extracts numeric max_capacity: 220');
    assert(parsed.extracted.min_capacity === 10, 'OCR parser extracts numeric min_capacity: 10');
    assert(parsed.extracted.accuracy_class === 'I', 'OCR parser extracts Class: I');

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    console.log(`--- PHASE 2 TEST RESULTS: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'} ---`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

runPhase2Tests();
