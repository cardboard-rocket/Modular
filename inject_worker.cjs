const fs = require('fs');
const file = 'assets/SimulationThread-KLJf4mFy.js';
let content = fs.readFileSync(file, 'utf8');
const logger = `self.addEventListener('error', e => fetch('/log_error', {method:'POST', body: 'WORKER ERROR: ' + e.message})); self.addEventListener('unhandledrejection', e => fetch('/log_error', {method:'POST', body: 'WORKER UNHANDLED: ' + e.reason}));\n`;
if (!content.startsWith('self.addEventListener')) {
  fs.writeFileSync(file, logger + content);
}
