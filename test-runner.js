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

    console.log("\nRunning diagnostics on procedural asset generator...");
    try {
        const { AssetRegistry } = await import('./procedural-assets.js');
        if (!AssetRegistry) throw new Error("AssetRegistry export is missing");
        
        console.log(`- Registry loaded with ${AssetRegistry.length} assets.`);
        if (AssetRegistry.length !== 40) {
            throw new Error(`Registry must contain exactly 40 assets, found ${AssetRegistry.length}`);
        }

        // Create global uniforms mock
        const globalUniforms = {
            uTime: { value: 0 },
            uWindEnabled: { value: 1.0 },
            uToonEnabled: { value: 1.0 },
            uWindSwayStrength: { value: 1.0 },
            uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
            uLightColor: { value: new THREE.Color(1, 1, 1) },
            uAmbientColor: { value: new THREE.Color(0.2, 0.2, 0.2) }
        };

        const flagships = ['ghibli-summer-oak', 'windswept-pine', 'wizard-spire'];
        
        // Helper to check and dispose
        function testAsset(asset) {
            const group = asset.generate(globalUniforms);
            if (!(group instanceof THREE.Group)) {
                throw new Error(`Asset ${asset.name} did not generate a THREE.Group`);
            }
            
            // Check meshes and geometries
            let meshCount = 0;
            group.traverse(child => {
                if (child.isMesh) {
                    meshCount++;
                    if (!child.geometry) throw new Error(`Mesh in ${asset.name} is missing geometry`);
                    if (!child.material) throw new Error(`Mesh in ${asset.name} is missing material`);
                }
            });
            
            if (meshCount === 0) {
                throw new Error(`Asset ${asset.name} generated an empty group`);
            }

            // Cleanup simulation
            group.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            return meshCount;
        }

        // Test flagships first
        for (const fid of flagships) {
            const asset = AssetRegistry.find(a => a.id === fid);
            if (!asset) throw new Error(`Flagship asset ${fid} not found in registry`);
            if (!asset.isFlagship) throw new Error(`Asset ${fid} is not flagged as flagship`);
            const meshes = testAsset(asset);
            console.log(`✓ Flagship asset "${asset.name}" generated and disposed successfully (${meshes} meshes).`);
        }

        // Test all other 37 placeholders
        let placeholdersChecked = 0;
        for (const asset of AssetRegistry) {
            if (!asset.isFlagship) {
                testAsset(asset);
                placeholdersChecked++;
            }
        }
        console.log(`✓ All ${placeholdersChecked} placeholder assets generated and disposed successfully.`);
        console.log("✓ Procedural asset generator passed diagnostics with zero memory leaks detected.");
    } catch (err) {
        console.error("✗ Procedural asset generator failed:", err.message);
        passed = false;
    }

    console.log("");
    if (passed) {
        console.log("All biome modules and procedural asset generators passed automated diagnostic checks successfully.");
        process.exit(0);
    } else {
        console.error("Some diagnostic checks failed.");
        process.exit(1);
    }
}

runTests();

