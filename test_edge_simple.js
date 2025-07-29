// Test simple pour debug Edge Function
const https = require('https');

const postData = JSON.stringify({
  query: 'hopital',
  targetCity: 'conakry'
});

const options = {
  hostname: 'nmwnibzgvwltipmtwhzo.supabase.co',
  path: '/functions/v1/location-search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.VRD1ipOvBfEQyckN-3wlDkJbdSfANmjU5bnKf66OdZk'
  }
};

console.log('🔍 Test simple Edge Function...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Not JSON:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();