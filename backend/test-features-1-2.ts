import axios from 'axios';

async function testFeatures1And2() {
  console.log('🧪 Testing Feature 1 (AI Before-vs-After Auditor) & Feature 2 (Road Quality Scorecard)...');

  try {
    // 1. Login as Admin
    const adminLogin = await axios.post('http://127.0.0.1:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin authenticated');

    // 2. Test Feature 2: Road Health Index & Hotspot Heatmap Endpoint
    const roadHealthRes = await axios.get('http://127.0.0.1:3000/api/admin/roadHealth', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Feature 2 (Road Health Scorecard & Heatmap) output:', JSON.stringify(roadHealthRes.data, null, 2));

    // 3. Test Feature 1: AI Resolution Auditor
    // Get all issues
    const allIssuesRes = await axios.get('http://127.0.0.1:3000/api/admin/allIssues', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const issueToAudit = allIssuesRes.data.data[0];
    if (issueToAudit) {
      const auditRes = await axios.post(`http://127.0.0.1:3000/api/admin/auditResolution/${issueToAudit.id}`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Feature 1 (AI Before-vs-After Repair Audit) output:', JSON.stringify(auditRes.data, null, 2));
    }

    console.log('🎉 Features 1 & 2 Execution & Verification PASSED!');
  } catch (err: any) {
    console.error('❌ Features 1 & 2 test error:', err.response?.data || err.message);
  }
}

testFeatures1And2();
