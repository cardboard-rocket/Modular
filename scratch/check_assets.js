import http from 'http';

const urls = [
    'http://localhost:3000/porco2/scene.gltf',
    'http://localhost:3000/porco2/scene.bin',
    'http://localhost:3000/kiki-lowpoly.glb',
    'http://localhost:3000/Princess.glb'
];

urls.forEach(url => {
    http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            if (data.length < 200) {
                data += chunk.toString('binary');
            }
        });
        res.on('end', () => {
            console.log(`URL: ${url}`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
            console.log(`Length: ${res.headers['content-length']}`);
            console.log(`Snippet: ${data.substring(0, 150).replace(/[\r\n]/g, ' ')}`);
            console.log('-----------------------------------');
        });
    }).on('error', (err) => {
        console.error(`Error fetching ${url}:`, err.message);
    });
});
