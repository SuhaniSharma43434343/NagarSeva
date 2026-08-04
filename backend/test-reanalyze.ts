import axios from 'axios';

async function testReanalyze() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;

    const issuesRes = await axios.get('http://localhost:3000/api/admin/allIssues', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const targetIssue = issuesRes.data.data[0];
    console.log('BEFORE RE-ANALYZE:', targetIssue.analysis);

    const reanalyzeRes = await axios.post(
      `http://localhost:3000/api/admin/analyzeIssue/${targetIssue.id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('AFTER RE-ANALYZE RESULT:', reanalyzeRes.data);
  } catch (err: any) {
    console.error('ERROR:', err.response?.data || err.message);
  }
}

testReanalyze();
