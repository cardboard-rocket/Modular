const fs = require('fs');
const files = fs.readdirSync('assets');
const urls = new Set();
files.forEach(file => {
  if (file.endsWith('.js') || file.endsWith('.css')) {
    const content = fs.readFileSync('assets/' + file, 'utf8');
    const match = content.match(/https?:\/\/[^\s\"']+|[a-zA-Z0-9_\-\/]+\.(png|jpg|jpeg|gif|json|wasm|glb|gltf|exr|hdr)/g);
    if (match) match.forEach(m => urls.add(m));
  }
});
console.log([...urls].join('\n'));
