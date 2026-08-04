import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    console.log('LOGIN SUCCESS RESPONSE:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('LOGIN ERROR:', err.response?.data || err.message);
  }
}

test();
