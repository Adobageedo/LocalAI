const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React Router (return index.html for all non-API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Check if SSL certificates exist
const certPath = path.join(__dirname, '../../localhost+1.pem');
const keyPath = path.join(__dirname, '../../localhost+1-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('❌ SSL certificates not found!');
  console.log('Please run the setup script first:');
  console.log('cd .. && cd .. && ./setup-local-test.sh');
  process.exit(1);
}

// HTTPS options
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Create HTTPS server
https.createServer(options, app).listen(3000, () => {
  console.log('🚀 React app is running on https://localhost:3000');
  console.log('📧 Ready for Outlook add-in testing!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Make sure your manifest points to https://localhost:3000');
  console.log('2. Sideload the manifest in Outlook');
  console.log('3. Test the add-in functionality');
}).on('error', (err) => {
  console.error('❌ Failed to start HTTPS server:', err);
  process.exit(1);
});
