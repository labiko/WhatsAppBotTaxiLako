// Debug Edge Function - voir réponse complète
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

console.log('🔍 Debug Edge Function location-search');
console.log('Request:', {
  url: `https://${options.hostname}${options.path}`,
  method: options.method,
  headers: options.headers,
  body: postData
});

const req = https.request(options, (res) => {
  console.log('\n📊 Response Status:', res.statusCode);
  console.log('📊 Response Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📊 Raw Response Data:');
    console.log(data);
    
    try {
      const json = JSON.parse(data);
      console.log('\n📊 Parsed JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\n❌ Not valid JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error);
});

req.write(postData);
req.end();