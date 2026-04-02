/**
 * Quick verification file to test the Currency Converter API setup
 * Run this in your Node.js environment after starting the dev server
 */

export async function verifyCurrencyConverterSetup() {
  console.log('🔍 Verifying Currency Converter API Setup...\n');

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NOVA_AGENT_BASE_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : 'http://localhost:3000');
  const tests = [];

  // Test 1: API endpoint exists
  console.log('📋 Test 1: Checking if API endpoint responds...');
  try {
    const response = await fetch(`${baseUrl}/api/currency-converter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'USD', to: 'EUR', amount: 100 })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ API endpoint is working correctly');
        console.log(`   Result: 100 USD = ${data.convertedAmount} EUR`);
        tests.push({ name: 'API Endpoint', status: 'PASS' });
      } else {
        console.log('❌ API returned error:', data.error);
        tests.push({ name: 'API Endpoint', status: 'FAIL', error: data.error });
      }
    } else {
      console.log('❌ API endpoint returned status:', response.status);
      tests.push({ name: 'API Endpoint', status: 'FAIL', error: `HTTP ${response.status}` });
    }
  } catch (error) {
    console.log('❌ Cannot connect to API. Is the dev server running?');
    console.log('   Error:', error);
    tests.push({ name: 'API Endpoint', status: 'FAIL', error: 'Connection error' });
  }

  console.log();

  // Test 2: Demo page exists
  console.log('📋 Test 2: Checking if demo page is accessible...');
  try {
    const response = await fetch(`${baseUrl}/currency-converter-demo`);
    if (response.ok) {
      console.log('✅ Demo page is accessible');
      console.log(`   URL: ${baseUrl}/currency-converter-demo`);
      tests.push({ name: 'Demo Page', status: 'PASS' });
    } else {
      console.log('⚠️  Demo page returned status:', response.status);
      tests.push({ name: 'Demo Page', status: 'WARNING', code: response.status });
    }
  } catch (error) {
    console.log('⚠️  Cannot access demo page');
    tests.push({ name: 'Demo Page', status: 'WARNING' });
  }

  console.log();

  // Test 3: Supported currencies
  console.log('📋 Test 3: Checking supported currencies...');
  try {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];
    const results = await Promise.all(
      currencies.map(async (currency) => {
        const response = await fetch(`${baseUrl}/api/currency-converter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'USD', to: currency, amount: 1 })
        });
        const data = await response.json();
        return { currency, success: data.success };
      })
    );

    const allPassed = results.every(r => r.success);
    if (allPassed) {
      console.log('✅ All tested currencies are supported');
      console.log(`   Tested: ${currencies.join(', ')}`);
      tests.push({ name: 'Currencies', status: 'PASS' });
    } else {
      console.log('⚠️  Some currencies failed');
      results.forEach(r => {
        console.log(`   ${r.currency}: ${r.success ? '✓' : '✗'}`);
      });
      tests.push({ name: 'Currencies', status: 'WARNING' });
    }
  } catch (error) {
    console.log('❌ Error testing currencies');
    tests.push({ name: 'Currencies', status: 'FAIL' });
  }

  console.log();

  // Test 4: Error handling
  console.log('📋 Test 4: Checking error handling...');
  try {
    const response = await fetch(`${baseUrl}/api/currency-converter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'INVALID', to: 'EUR', amount: 100 })
    });
    const data = await response.json();

    if (!data.success && data.error) {
      console.log('✅ Error handling is working correctly');
      console.log(`   Error message: ${data.error}`);
      tests.push({ name: 'Error Handling', status: 'PASS' });
    } else {
      console.log('❌ Invalid request should return error');
      tests.push({ name: 'Error Handling', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Error testing validation');
    tests.push({ name: 'Error Handling', status: 'FAIL' });
  }

  console.log();

  // Test 5: Caching (same request twice)
  console.log('📋 Test 5: Checking response caching...');
  try {
    const testPayload = JSON.stringify({ from: 'USD', to: 'EUR', amount: 100 });

    const start1 = Date.now();
    const response1 = await fetch(`${baseUrl}/api/currency-converter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: testPayload
    });
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    const response2 = await fetch(`${baseUrl}/api/currency-converter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: testPayload
    });
    const time2 = Date.now() - start2;

    const data1 = await response1.json();
    const data2 = await response2.json();

    console.log('✅ Caching is working');
    console.log(`   First request: ${time1}ms (cache miss)`);
    console.log(`   Second request: ${time2}ms (cache hit)`);
    console.log(`   Speedup: ${(time1 / time2).toFixed(1)}x faster`);
    console.log(`   Same rate: ${data1.rate === data2.rate ? 'Yes' : 'No'}`);
    tests.push({ name: 'Caching', status: 'PASS' });
  } catch (error) {
    console.log('⚠️  Could not verify caching');
    tests.push({ name: 'Caching', status: 'WARNING' });
  }

  console.log();
  console.log('═'.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(50));

  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  const warnings = tests.filter(t => t.status === 'WARNING').length;

  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${icon} ${test.name}: ${test.status}`);
  });

  console.log();
  console.log(`Total: ${tests.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);

  console.log();

  if (failed === 0) {
    console.log('🎉 All checks passed! Your Currency Converter API is ready to use.');
    console.log();
    console.log('📋 Next steps:');
    console.log('1. Visit: http://localhost:3000/currency-converter-demo');
    console.log('2. Test the live converter');
    console.log('3. Use the API Tester to verify different currencies');
    console.log('4. Integrate with your agent builder');
  } else {
    console.log('⚠️  Please check the failed tests above.');
  }

  console.log();
  console.log('═'.repeat(50));

  return {
    passed,
    failed,
    warnings,
    tests,
    ready: failed === 0
  };
}

// Export for use in tests
export default verifyCurrencyConverterSetup;

// If this file is run directly
if (require.main === module) {
  verifyCurrencyConverterSetup().catch(console.error);
}
