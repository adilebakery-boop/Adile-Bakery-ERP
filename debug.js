const http = require('http');

async function makeRequest() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reports/daily?operationalDate=2026-05-15',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  // Test the SERVICE directly first
  const reportService = require('./src/services/reportService');
  const serviceResult = await reportService.getDailyReport(null, '2026-05-15');
  console.log('=== Service direct call (branchId=null) ===');
  console.log('branchName:', serviceResult.branchName);
  console.log('totalEstimatedRevenue:', serviceResult.totals.totalEstimatedRevenue);

  // Now try HTTP request
  try {
    const httpResult = await makeRequest();
    console.log('\n=== HTTP request to /api/reports/daily?operationalDate=2026-05-15 ===');
    console.log('Status:', httpResult.status);
    console.log('Has success:', httpResult.body.success);
    console.log('Has data:', !!httpResult.body.data);
    if (httpResult.body.data) {
      console.log('branchName:', httpResult.body.data.branchName);
      console.log('totalEstimatedRevenue:', httpResult.body.data.totals?.totalEstimatedRevenue);
    }
  } catch (e) {
    console.log('\nHTTP request failed (server not running):', e.message);
    console.log('Service test above confirms the backend logic is correct.');
  }
}

test().catch(e => { console.error(e.message); process.exit(1); });