import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function testE2EPipeline() {
  console.log('🧪 Starting End-to-End Pothole Detection & AI Analysis Test...');

  try {
    // 1. Login as Surveyor
    const surveyorLogin = await axios.post('http://127.0.0.1:3000/api/surveyor/login', {
      email: 'amit.patel@vmc.gov.in',
      password: 'password'
    });
    const surveyorToken = surveyorLogin.data.token;
    console.log('✅ Surveyor login successful');

    // 2. Get Surveyor Assignments
    const assignmentsRes = await axios.post('http://127.0.0.1:3000/api/surveyor/assignments', {}, {
      headers: { Authorization: `Bearer ${surveyorToken}` }
    });
    const assignment = assignmentsRes.data.assignments?.[0];
    if (!assignment) {
      console.error('❌ No surveyor assignment found');
      return;
    }
    console.log(`✅ Assignment retrieved: Route "${assignment.route.name}" (ID: ${assignment.routeId})`);

    // 3. Start Survey Session
    const startSurveyRes = await axios.post('http://127.0.0.1:3000/api/surveyor/startSurvey', {
      routeAssignmentId: assignment.id,
      startedAt: new Date().toISOString(),
    }, {
      headers: { Authorization: `Bearer ${surveyorToken}` }
    });
    const surverySessionId = startSurveyRes.data.surverySessionId;
    console.log(`✅ Survey Session started (ID: ${surverySessionId})`);

    // 4. Report Single On-Device Pothole Detection (Surveyor Mobile App)
    const detectionForm = new FormData();
    detectionForm.append('routeId', assignment.routeId);
    detectionForm.append('wardId', assignment.route.wardId);
    detectionForm.append('surverySessionId', surverySessionId);
    detectionForm.append('routeAssignmentId', assignment.id);
    detectionForm.append('latitude', '22.3085');
    detectionForm.append('longitude', '73.1732');
    detectionForm.append('confidence', '0.91');
    
    // Create a dummy image buffer if no local image exists
    const dummyBuf = Buffer.from('Fake JPEG image content for e2e test');
    detectionForm.append('photo', dummyBuf, { filename: 'pothole_test.jpg', contentType: 'image/jpeg' });

    const reportRes = await axios.post('http://127.0.0.1:3000/api/surveyor/reportDetection', detectionForm, {
      headers: {
        Authorization: `Bearer ${surveyorToken}`,
        ...detectionForm.getHeaders()
      }
    });

    console.log('✅ Pothole Detection reported by Surveyor:', reportRes.data);
    const createdIssueId = reportRes.data.data.id;

    // 5. Admin Login & AI Analysis
    const adminLogin = await axios.post('http://127.0.0.1:3000/api/admin/login', {
      email: 'admin@vmc.gov.in',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin login successful');

    // 6. Admin triggers AI Analysis for Depth/Severity/Priority
    const analyzeRes = await axios.post(`http://127.0.0.1:3000/api/admin/analyzeIssue/${createdIssueId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Admin AI Analysis result:', JSON.stringify(analyzeRes.data, null, 2));

    // 7. Verify issue appears in GET /api/admin/allIssues
    const allIssuesRes = await axios.get('http://127.0.0.1:3000/api/admin/allIssues', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundIssue = allIssuesRes.data.data.find((i: any) => i.id === createdIssueId);
    console.log('✅ Found newly detected issue in Admin Dashboard feed:', {
      id: foundIssue?.id,
      status: foundIssue?.status,
      confidence: foundIssue?.confidence,
      analysis: foundIssue?.analysis
    });

    console.log('🎉 End-to-End Detection & AI Analysis Pipeline PASSED!');
  } catch (err: any) {
    console.error('❌ E2E test error:', err.response?.data || err.message || err);
    if (err.stack) console.error(err.stack);
  }
}

testE2EPipeline();
