
// Root entry point for Render
const path = require('path');
const serverPath = path.join(__dirname, 'server', 'server.js');

console.log('Starting NexusHR from root index.js...');
console.log('Looking for server at:', serverPath);

try {
  require('./server/server.js');
} catch (err) {
  console.error('Failed to load server/server.js from root:');
  console.error(err);
  process.exit(1);
}
