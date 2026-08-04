import axios from 'axios';

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    console.log('Got Token:', token);

    const empRes = await axios.get('http://localhost:3000/api/admin/employees', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('EMPLOYEES API RESPONSE:', JSON.stringify(empRes.data, null, 2));
  } catch (err: any) {
    console.error('API ERROR:', err.response?.data || err.message);
  }
}

test();
