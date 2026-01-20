#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://script.google.com/macros/s/AKfycbz2dlQNwe56QsRgTUEQcqaCelX1DvfOucaTeVbGSwIK0YCC9Gor55q41a2gAGq5aBUwRQ/exec';
const AUTHORIZED_DOMAINS = process.env.AUTHORIZED_DOMAINS || 'yourdomain.com';

console.log('Building with environment variables...');
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
console.log('BACKEND_URL:', BACKEND_URL.substring(0, 50) + '...');
console.log('AUTHORIZED_DOMAINS:', AUTHORIZED_DOMAINS);

// Read the index.html file
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace the Google Client ID in the meta tag
html = html.replace(
    /content="[^"]*\.apps\.googleusercontent\.com"/,
    `content="${GOOGLE_CLIENT_ID}"`
);

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Inject environment variables as a script tag before the closing head tag
const envScript = `
    <script>
        window.ENV = {
            GOOGLE_CLIENT_ID: '${GOOGLE_CLIENT_ID}',
            BACKEND_URL: '${BACKEND_URL}',
            AUTHORIZED_DOMAINS: '${AUTHORIZED_DOMAINS}'.split(',').map(d => d.trim())
        };
    </script>
`;

html = html.replace('</head>', `${envScript}\n</head>`);

// Write the modified HTML to public/index.html
const outputPath = path.join(publicDir, 'index.html');
fs.writeFileSync(outputPath, html);

console.log('✓ Build complete! Output written to public/index.html');
