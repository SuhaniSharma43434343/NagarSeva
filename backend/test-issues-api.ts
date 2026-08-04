import axios from 'axios';

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;

    const issuesRes = await axios.get('http://localhost:3000/api/admin/allIssues', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('ISSUES API RESPONSE:', JSON.stringify(issuesRes.data, null, 2));
  } catch (err: any) {
    console.error('ERROR:', err.response?.data || err.message);
  }
}

test();
