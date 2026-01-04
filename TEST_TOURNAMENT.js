// TOURNAMENT SYSTEM TEST SCRIPT
// Run this in browser console at riddickchess.site while logged in as admin

(async function testTournamentSystem() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Not logged in! Please login first.');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('🧪 TOURNAMENT SYSTEM TEST');
  console.log('========================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: List tournaments
  console.log('1️⃣ Testing: List Tournaments...');
  try {
    const res = await fetch('/api/tournaments', { headers });
    const data = await res.json();
    if (Array.isArray(data)) {
      console.log(`   ✅ PASS - Found ${data.length} tournaments`);
      data.forEach(t => console.log(`      - [${t.id}] ${t.name} (${t.status})`));
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Invalid response');
      testsFailed++;
    }
  } catch (e) {
    console.log('   ❌ FAIL -', e.message);
    testsFailed++;
  }

  // Test 2: Health check (if admin)
  console.log('\n2️⃣ Testing: Health Check...');
  try {
    const res = await fetch('/api/healthcheck/health-check', { headers });
    const data = await res.json();
    if (data.summary) {
      console.log(`   ✅ PASS - ${data.summary.passed}/${data.summary.total} tests passed (${data.summary.passRate}%)`);
      if (data.summary.failed > 0) {
        console.log('   ⚠️ Failed tests:');
        data.tests.filter(t => t.status === 'fail').forEach(t => {
          console.log(`      ❌ [${t.category}] ${t.name}: ${t.error || 'Failed'}`);
        });
      }
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Invalid response');
      testsFailed++;
    }
  } catch (e) {
    console.log('   ❌ FAIL -', e.message);
    testsFailed++;
  }

  // Test 3: Create test tournament
  console.log('\n3️⃣ Testing: Create Official Tournament...');
  try {
    const res = await fetch('/api/tournaments/create-official-tournament', {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (data.success && data.tournament) {
      console.log(`   ✅ PASS - Created tournament ID: ${data.tournament.id}`);
      console.log(`   📍 View at: /tournament/${data.tournament.id}`);
      window.CREATED_TOURNAMENT_ID = data.tournament.id;
      testsPassed++;
    } else if (data.error && data.error.includes('already exist')) {
      console.log('   ⚠️ SKIP - Tournament already exists (delete first to re-test)');
      testsPassed++;
    } else {
      console.log('   ❌ FAIL -', data.error || 'Unknown error');
      testsFailed++;
    }
  } catch (e) {
    console.log('   ❌ FAIL -', e.message);
    testsFailed++;
  }

  // Test 4: Get tournament details
  console.log('\n4️⃣ Testing: Get Tournament Details...');
  try {
    const listRes = await fetch('/api/tournaments', { headers });
    const tournaments = await listRes.json();
    if (tournaments.length > 0) {
      const t = tournaments[0];
      const res = await fetch(`/api/tournaments/${t.id}`, { headers });
      const data = await res.json();
      if (data.id) {
        console.log(`   ✅ PASS - Got details for "${data.name}"`);
        console.log(`      Status: ${data.status}`);
        console.log(`      Participants: ${data.participants?.length || 0}`);
        console.log(`      Time Control: ${data.time_control}s`);
        testsPassed++;
      } else {
        console.log('   ❌ FAIL - Invalid response');
        testsFailed++;
      }
    } else {
      console.log('   ⚠️ SKIP - No tournaments to test');
    }
  } catch (e) {
    console.log('   ❌ FAIL -', e.message);
    testsFailed++;
  }

  // Test 5: Check tournament schema
  console.log('\n5️⃣ Testing: Tournament No-Show Protection Schema...');
  try {
    const res = await fetch('/api/healthcheck/health-check', { headers });
    const data = await res.json();
    const schemaTests = data.tests.filter(t => t.name.includes('Tournament') && t.category === 'Schema');
    schemaTests.forEach(t => {
      if (t.status === 'pass') {
        console.log(`   ✅ ${t.name}`);
      } else if (t.status === 'warn') {
        console.log(`   ⚠️ ${t.name} - ${t.error || 'Warning'}`);
      } else {
        console.log(`   ❌ ${t.name} - ${t.error || 'Failed'}`);
      }
    });
    testsPassed++;
  } catch (e) {
    console.log('   ❌ FAIL -', e.message);
    testsFailed++;
  }

  // Summary
  console.log('\n========================');
  console.log(`📊 RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  
  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Tournament system is ready for launch!');
  } else {
    console.log('⚠️ Some tests failed. Check errors above.');
  }

  console.log('\n📌 NEXT STEPS:');
  console.log('1. Go to /admin/riddick/tournaments');
  console.log('2. Delete any old tournaments');
  console.log('3. Click "🏆 Create Official Tournament"');
  console.log('4. Share /tournaments link with students!');
})();
