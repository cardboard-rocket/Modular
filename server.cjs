const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const TARGET = 'www.florasynth.com';

const server = http.createServer((req, res) => {
  console.log('Request:', req.url);

  if (req.url === '/log_error' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('BROWSER ERROR:', body);
      res.writeHead(200);
      res.end();
    });
    return;
  }

  // Serve local HTML
  if (req.url === '/' || req.url.startsWith('/editor')) {
    fs.readFile(path.join(__dirname, 'flora.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading flora.html');
        return;
      }
      
      const errorLogger = `
      <script>
        window.addEventListener('error', function(e) {
          fetch('/log_error', { method: 'POST', body: e.message + ' at ' + e.filename + ':' + e.lineno });
        });
        window.addEventListener('unhandledrejection', function(e) {
          fetch('/log_error', { method: 'POST', body: 'Unhandled rejection: ' + e.reason });
        });
        const originalConsoleError = console.error;
        console.error = function(...args) {
          fetch('/log_error', { method: 'POST', body: 'Console error: ' + args.join(' ') });
          originalConsoleError.apply(console, args);
        };
      </script>
      `;
      data = data.replace('</head>', errorLogger + '</head>');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Mock authentication endpoint to prevent hanging if proxy fails
  if (req.url === '/api/auth/refresh-token' || req.url === '/auth/refresh-token') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false }));
    return;
  }

  // Serve local assets, fallback to proxy if not found locally
  if (req.url.startsWith('/assets/')) {
    const filePath = path.join(__dirname, req.url.split('?')[0]);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.wasm') contentType = 'application/wasm';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
      return;
    } else {
      console.log('Local asset not found, proxying:', req.url);
      // Let it fall through to the proxy code below
    }
  }

  let targetHostname = TARGET;
  let targetPath = req.url;

  if (req.url.startsWith('/api/')) {
    targetHostname = 'api.florasynth.com';
    targetPath = req.url.replace(/^\/api/, '');
  }

  const options = {
    hostname: targetHostname,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetHostname,
      origin: 'https://www.florasynth.com',
      referer: 'https://www.florasynth.com/editor'
    }
  };

  const proxy = https.request(options, function(proxyRes) {
    const headers = { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxy, { end: true });

  proxy.on('error', function(err) {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error');
  });
});

server.listen(PORT, () => {
  console.log(`Local Florasynth editor is running on http://localhost:${PORT}`);
  console.log('Local assets are editable in the /assets/ directory.');
});
