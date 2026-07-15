const fs = require('fs');
const https = require('https');
const content = fs.readFileSync('assets/index-5qFO5Xkw.js', 'utf8');
const match = content.match(/m\.f=\[([^\]]+)\]/);
if (match) {
  const files = match[1].replace(/"/g, '').split(',');
  files.forEach(file => {
    const url = 'https://www.florasynth.com/' + file;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(file, data);
        console.log('Downloaded', file);
      });
    });
  });
}
