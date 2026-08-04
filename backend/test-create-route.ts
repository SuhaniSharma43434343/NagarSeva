import axios from 'axios';

async function testCreateRoute() {
  console.log('🧪 Testing Admin Create Custom Route Endpoint...');

  try {
    // 1. Login as Admin
    const adminLogin = await axios.post('http://127.0.0.1:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin authenticated');

    // 2. Fetch Wards
    const wardsRes = await axios.get('http://127.0.0.1:3000/api/admin/routes', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const existingRoute = wardsRes.data.data[0];
    const wardId = existingRoute ? existingRoute.wardId : '17465fe8-7cc1-4e57-9255-ec37e9292e8f';

    // 3. Create Custom Route
    const createRes = await axios.post('http://127.0.0.1:3000/api/admin/createRoute', {
      name: 'OP Road to Bird Circle Highway',
      wardId,
      distance: 3.2,
      startLat: 22.3120,
      startLon: 73.1680,
      endLat: 22.3250,
      endLon: 73.1800
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('✅ Custom Route Created Output:', JSON.stringify(createRes.data, null, 2));
    console.log('🎉 Create Route Verification PASSED!');
  } catch (err: any) {
    console.error('❌ Create route error:', err.response?.data || err.message);
  }
}

testCreateRoute();
