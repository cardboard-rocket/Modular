import * as THREE from 'three';

const biomes = [
    'terrain-jungle.js',
    'terrain-archipelago.js',
    'terrain-ghibli.js',
    'terrain-plains.js',
    'terrain-mountains.js',
    'terrain-magical.js'
];

// Mock snoise function
function snoise(x, y) {
    return Math.sin(x) * Math.cos(y);
}

// Mock smoothstep
function smoothstep(min, max, value) {
    let x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

async function runTests() {
    console.log("Running diagnostics on biome modules...");
    let passed = true;

    for (const file of biomes) {
        try {
            const modulePath = './' + file;
            const biome = (await import(modulePath)).default;
            
            if (!biome) throw new Error("Default export is missing");
            if (typeof biome.name !== 'string') throw new Error("biome.name must be a string");
            if (typeof biome.shoreName !== 'string') throw new Error("biome.shoreName must be a string");
            if (typeof biome.getHeight !== 'function') throw new Error("biome.getHeight must be a function");
            if (typeof biome.getColor !== 'function') throw new Error("biome.getColor must be a function");
            
            // Run coordinates test
            const coords = [
                { x: 0, z: 0 },
                { x: 1000, z: -1000 },
                { x: -5000, z: 5000 },
                { x: 1e6, z: -1e6 }
            ];
            
            const tempColor = new THREE.Color();
            
            for (const coord of coords) {
                const h = biome.getHeight(coord.x, coord.z, snoise, 1.0);
                if (typeof h !== 'number' || isNaN(h)) {
                    throw new Error(`getHeight returned NaN or non-number for (${coord.x}, ${coord.z}): ${h}`);
                }
                
                // Color test
                tempColor.set(0xffffff);
                biome.getColor(h, coord.x, coord.z, snoise, tempColor, smoothstep);
                if (isNaN(tempColor.r) || isNaN(tempColor.g) || isNaN(tempColor.b)) {
                    throw new Error(`getColor output contains NaN for height ${h} at (${coord.x}, ${coord.z})`);
                }
            }
            console.log(`✓ ${file} passed diagnostics.`);
        } catch (err) {
            console.error(`✗ ${file} failed:`, err.message);
            passed = false;
        }
    }

    if (passed) {
        console.log("All 6 biome modules passed automated diagnostic checks successfully.");
        process.exit(0);
    } else {
        console.error("Some biome modules failed diagnostic checks.");
        process.exit(1);
    }
}

runTests();
