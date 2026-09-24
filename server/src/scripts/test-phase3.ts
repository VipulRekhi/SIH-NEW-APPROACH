import { query } from '../config/db.js';

async function runPhase3ApiTests() {
  const baseUrl = 'http://localhost:5000';
  console.log('================================================================');
  console.log('STARTING PHASE 3 API INTEGRATION & TEST SESSION LIFECYCLE TESTS');
  console.log('================================================================\n');

  let failures = 0;
  function assert(condition: boolean, msg: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
    } else {
      failures++;
      console.error(`[FAIL] ${msg} ${detail ? `- ${detail}` : ''}`);
    }
  }

  try {
    // 1. Authenticate as admin
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nawi.gov.in', password: 'Admin@123456' })
    });
    const loginData: any = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.data?.token, 'Login as admin succeeds');
    const token = loginData.data.token;

    // 2. Fetch Essae DS-252 instrument
    const instRes = await fetch(`${baseUrl}/api/instruments?search=DS252`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const instData: any = await instRes.json();
    const essae = instData.data?.instruments?.find((i: any) => i.model_number === 'DS-252');
    assert(!!essae, 'Seeded Essae DS-252 instrument retrieved');
    const instrumentId = essae.id;

    // 3. Fetch Test Types & Rule Registry
    const typesRes = await fetch(`${baseUrl}/api/test-types`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const typesData: any = await typesRes.json();
    assert(typesRes.status === 200 && typesData.data?.testTypes?.length >= 5, 'GET /api/test-types returns registered test types');

    const rulesRes = await fetch(`${baseUrl}/api/test-rule-registry`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rulesData: any = await rulesRes.json();
    assert(rulesRes.status === 200 && rulesData.data?.rules?.length >= 10, 'GET /api/test-rule-registry returns OIML R-76 clauses');

    // 4. Create Test Session
    const createSessionRes = await fetch(`${baseUrl}/api/test-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instrumentId,
        regulatoryMode: 'TYPE_EVALUATION',
        testDate: new Date().toISOString().split('T')[0],
        environmentalConditions: {
          temperature: 22.4,
          humidity: 52,
          atmosphericPressure: 1013.25,
          remarks: 'Standard laboratory ambient conditions'
        },
        referenceStandards: [
          {
            identifier: 'STD-F1-SET-01',
            nominalMass: 30,
            unit: 'kg',
            certificateNumber: 'NPL/2026/CAL/4012',
            certificateValidUntil: '2027-12-31',
            reportedError: 0.001
          }
        ],
        notes: 'Official Phase 3 demonstration test session for SIH 2026'
      })
    });
    const sessionData: any = await createSessionRes.json();
    assert(createSessionRes.status === 201 && !!sessionData.data?.session?.id, 'POST /api/test-sessions creates session (201 Created)');
    const sessionId = sessionData.data?.session?.id;
    const sessionTests = sessionData.data?.tests || [];
    assert(sessionTests.length >= 5, 'Session initialized with core tests assigned');

    // 5. Generate Recommended Test Load Plan
    const planRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/plan`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const planData: any = await planRes.json();
    assert(planRes.status === 200 && planData.data?.plan?.length >= 5, 'POST /api/test-sessions/:id/plan generates recommended load plan');

    // 6. Test Weighing Performance Workflow
    const weighTest = sessionTests.find((t: any) => t.code === 'WEIGHING_PERFORMANCE');
    assert(!!weighTest, 'Weighing Performance test found in session');

    // Add observations: 5 kg, 10 kg, 20 kg, 30 kg
    const loads = [
      { load: 5, ind: 5.005, deltaL: 0.005 },
      { load: 10, ind: 10.005, deltaL: 0.005 },
      { load: 20, ind: 20.005, deltaL: 0.005 },
      { load: 30, ind: 30.010, deltaL: 0.005 }
    ];

    for (let i = 0; i < loads.length; i++) {
      const addObsRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${weighTest.id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequenceNo: i + 1,
          direction: 'LOADING',
          loadValue: loads[i].load,
          indicationValue: loads[i].ind,
          additionalLoad: loads[i].deltaL
        })
      });
      assert(addObsRes.status === 201, `Added weighing observation load=${loads[i].load} kg`);
    }

    // Trigger calculation
    const calcWeighRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${weighTest.id}/calculate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const calcWeighData: any = await calcWeighRes.json();
    assert(calcWeighRes.status === 200 && calcWeighData.data?.status === 'PASS', 'POST calculate Weighing Performance returns PASS');
    assert(calcWeighData.data?.results?.length === 4, 'Preserves 4 auditable test_results entries');

    // 7. Test Repeatability Workflow
    const repTest = sessionTests.find((t: any) => t.code === 'REPEATABILITY');
    assert(!!repTest, 'Repeatability test found in session');

    // Add 10 readings at 10 kg
    for (let i = 1; i <= 10; i++) {
      await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${repTest.id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequenceNo: i,
          loadValue: 10,
          indicationValue: i % 2 === 0 ? 10.005 : 10.000,
          repeatNumber: i
        })
      });
    }

    const calcRepRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${repTest.id}/calculate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const calcRepData: any = await calcRepRes.json();
    assert(calcRepRes.status === 200 && calcRepData.data?.status === 'PASS', 'POST calculate Repeatability with 10 readings returns PASS');

    // 8. Test Eccentric Loading Workflow
    const eccTest = sessionTests.find((t: any) => t.code === 'ECCENTRIC_LOADING');
    assert(!!eccTest, 'Eccentric Loading test found in session');

    const positions = ['CENTER', 'FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'];
    for (let i = 0; i < positions.length; i++) {
      await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${eccTest.id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequenceNo: i + 1,
          position: positions[i],
          loadValue: 10,
          indicationValue: 10.005
        })
      });
    }

    const calcEccRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${eccTest.id}/calculate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const calcEccData: any = await calcEccRes.json();
    assert(calcEccRes.status === 200 && calcEccData.data?.status === 'PASS', 'POST calculate Eccentric Loading returns PASS');

    // 9. Test Discrimination Workflow
    const discTest = sessionTests.find((t: any) => t.code === 'DISCRIMINATION');
    if (discTest) {
      await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${discTest.id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequenceNo: 1,
          loadValue: 10,
          indicationValue: 10.005,
          additionalLoad: 0.007 // 1.4d = 1.4 * 0.005
        })
      });

      const calcDiscRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${discTest.id}/calculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const calcDiscData: any = await calcDiscRes.json();
      assert(calcDiscRes.status === 200 && calcDiscData.data?.status === 'PASS', 'POST calculate Discrimination returns PASS');
    }

    // 10. Test Zero-Setting Workflow
    const zeroTest = sessionTests.find((t: any) => t.code === 'ZERO_SETTING');
    if (zeroTest) {
      await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${zeroTest.id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequenceNo: 1,
          loadValue: 0.005,
          indicationValue: 0.000,
          additionalLoad: 0.004,
          remarks: 'Zero-setting button pressed'
        })
      });

      const calcZeroRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/tests/${zeroTest.id}/calculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const calcZeroData: any = await calcZeroRes.json();
      assert(calcZeroRes.status === 200 && calcZeroData.data?.status === 'PASS', 'POST calculate Zero-Setting returns PASS');
    }

    // 11. Evaluate Session Overall Status
    const evalRes = await fetch(`${baseUrl}/api/test-sessions/${sessionId}/evaluate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const evalData: any = await evalRes.json();
    assert(evalRes.status === 200 && !!evalData.data?.overallStatus, 'POST /api/test-sessions/:id/evaluate computes overall session status');
    console.log(`Evaluated Session Overall Status: ${evalData.data?.overallStatus}`);

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    console.log('\n================================================================');
    console.log(`PHASE 3 API TEST SUMMARY: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'}`);
    console.log('================================================================');
    process.exit(failures === 0 ? 0 : 1);
  }
}

runPhase3ApiTests();
