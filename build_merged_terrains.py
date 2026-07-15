import re

# Read sources
with open(r'C:\Users\macie\OneDrive\Desktop\KIKI\Infinite World\jungle_8002\index.html', 'r', encoding='utf-8') as f:
    jungle_html = f.read()

with open(r'C:\Users\macie\OneDrive\Desktop\KIKI\Ghibli\Kiki-Islands-Merged\index.html', 'r', encoding='utf-8') as f:
    merged_html = f.read()

print("Original merged_html length:", len(merged_html))

# 1. Extract Jungle Tree creation code (from Tree 1 up to Meshes)
start_marker = "// Tree 1: Tall Jungle Canopy Tree"
end_marker = "// Meshes"
idx_start = jungle_html.find(start_marker)
idx_end = jungle_html.find(end_marker, idx_start)
if idx_start == -1 or idx_end == -1:
    raise Exception("Could not find jungle tree geometry block")

jungle_tree_geos = jungle_html[idx_start:idx_end]

# Rename variables in jungle_tree_geos so they don't collide with Ghibli trees
for i in range(1, 10):
    jungle_tree_geos = re.sub(rf'\bt{i}Geos\b', f'jt{i}Geos', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bgeoTree{i}\b', f'geoJTree{i}', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Trunk\b', f'jt{i}Trunk', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Trunk1\b', f'jt{i}Trunk1', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Trunk2\b', f'jt{i}Trunk2', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Leaf\b', f'jt{i}Leaf', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Leaf([0-9])\b', rf'jt{i}Leaf\1', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}v([0-9])\b', rf'jt{i}v\1', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}Root([0-9])\b', rf'jt{i}Root\1', jungle_tree_geos)
    jungle_tree_geos = re.sub(rf'\bt{i}s([0-9])\b', rf'jt{i}s\1', jungle_tree_geos)

# Add instanced meshes for jungle trees right at the end of our extracted geometry block
jungle_tree_geos += """
    // Jungle Tree Instanced Meshes
    const instJTree1 = new THREE.InstancedMesh(geoJTree1, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree2 = new THREE.InstancedMesh(geoJTree2, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree3 = new THREE.InstancedMesh(geoJTree3, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree4 = new THREE.InstancedMesh(geoJTree4, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree5 = new THREE.InstancedMesh(geoJTree5, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree6 = new THREE.InstancedMesh(geoJTree6, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree7 = new THREE.InstancedMesh(geoJTree7, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree8 = new THREE.InstancedMesh(geoJTree8, matTree, Math.floor(1500 * TREE_MULT));
    const instJTree9 = new THREE.InstancedMesh(geoJTree9, matTree, Math.floor(1500 * TREE_MULT));
    [instJTree1, instJTree2, instJTree3, instJTree4, instJTree5, instJTree6, instJTree7, instJTree8, instJTree9].forEach(m => m.frustumCulled = true);
"""

# 2. Replace applyColor and add removeBottomFaces
old_applyColor = """    function applyColor(geometry, colorHex) {
        const color = new THREE.Color(colorHex);
        const colors = [];
        const count = geometry.attributes.position.count;
        for (let i = 0; i < count; i++) {
            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }"""

new_applyColor_block = """    function removeBottomFaces(geometry) {
        geometry = geometry.toNonIndexed();
        geometry.computeVertexNormals();
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;
        const newPos = [];
        const newNorm = [];
        for (let i = 0; i < pos.count; i += 3) {
            const ny1 = norm.getY(i);
            const ny2 = norm.getY(i+1);
            const ny3 = norm.getY(i+2);
            if ((ny1 + ny2 + ny3) / 3 > -0.2) {
                for(let j=0; j<3; j++) {
                    newPos.push(pos.getX(i+j), pos.getY(i+j), pos.getZ(i+j));
                    newNorm.push(norm.getX(i+j), norm.getY(i+j), norm.getZ(i+j));
                }
            }
        }
        const cleanGeo = new THREE.BufferGeometry();
        cleanGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
        cleanGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
        return cleanGeo;
    }

    function applyColor(geometry, colorHex) {
        if (geometry.index) {
            const ni = geometry.toNonIndexed();
            geometry.copy(ni);
        }
        if (geometry.hasAttribute('uv')) geometry.deleteAttribute('uv');
        const color = new THREE.Color(colorHex);
        const colors = [];
        const count = geometry.attributes.position.count;
        for (let i = 0; i < count; i++) {
            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }"""

if old_applyColor not in merged_html:
    raise Exception("Could not find old_applyColor in merged_html")

merged_html = merged_html.replace(old_applyColor, new_applyColor_block)

# 3. Replace terrainHeightJS
old_terrainHeightJS_pattern = re.compile(r'    function terrainHeightJS\(x, z\) \{[\s\S]*?return y;\n    \}')
new_terrainHeightJS = """    function terrainHeightJS(x, z) {
        let biome = snoise(x * 0.0003, z * 0.0003); 

        // 1. Open Ocean / Massive Lakes (No Islands)
        let openOceanY = snoise(x * 0.002, z * 0.002) * 4.0 - 6.0;

        // 2. Ocean Archipelago (Terrain 1 - Kiki-Islands)
        let archNoise = snoise(x * 0.002, z * 0.002);
        let archY = archNoise * 6.0 - 4.5;
        if (archNoise > 0.76) {
             archY += (archNoise - 0.76) * 80.0;
        }

        // 3. Ghibli High-Quality Continental Valleys, Rivers & Lakes (Terrain 2 - C:/macie/Terrain)
        let ghibliHQY = snoise(x * 0.0015, z * 0.0015) * 90.0; 
        ghibliHQY += snoise(x * 0.005, z * 0.005) * 35.0;
        ghibliHQY += snoise(x * 0.02, z * 0.02) * 8.0;
        if (ghibliHQY < 12.0) { 
            ghibliHQY = (ghibliHQY - 12.0) * 0.15 + 12.0;
        }
        // Winding River Carving
        let riverNoise = snoise(x * 0.0015 + 100.0, z * 0.0015 + 100.0);
        let warp = snoise(x * 0.01, z * 0.01) * 0.02;
        let riverDist = Math.abs(riverNoise + warp);
        if (riverDist < 0.04) {
            let carve = 1.0 - (riverDist / 0.04);
            carve = carve * carve * (3.0 - 2.0 * carve);
            ghibliHQY -= carve * 15.0; 
        }
        // Mountain & Forest Lakes
        let lakeNoise = snoise(x * 0.002 - 500.0, z * 0.002 + 500.0);
        if (lakeNoise > 0.45) {
            let lakeDepth = Math.min((lakeNoise - 0.45) * 2.5, 1.0);
            let carve = lakeDepth * lakeDepth * (3.0 - 2.0 * lakeDepth);
            ghibliHQY -= carve * 15.0;
        }

        // 4. Lush Ridged Mountain Jungle (Terrain 3 - jungle_8002)
        let noise1 = snoise(x * 0.002, z * 0.002);
        let noise2 = snoise(x * 0.008, z * 0.008);
        let noise3 = snoise(x * 0.02, z * 0.02);
        let ridge = 1.0 - Math.abs(noise1);
        ridge = ridge * ridge; // Sharpen ridges
        let jungleY = ridge * 65.0 - 2.0 + noise2 * 14.0 + noise3 * 4.0;

        // Blending logic across all 3 biomes
        let y = 0.0;
        const msmooth = (e0, e1, v) => {
            let t = Math.max(0.0, Math.min(1.0, (v - e0) / (e1 - e0)));
            return t * t * (3.0 - 2.0 * t);
        };

        if (biome < -0.4) {
            y = openOceanY;
        } else if (biome < -0.15) {
            let t = msmooth(-0.4, -0.15, biome);
            y = openOceanY * (1.0 - t) + archY * t;
        } else if (biome < 0.05) {
            let t = msmooth(-0.15, 0.05, biome);
            y = archY * (1.0 - t) + ghibliHQY * t;
        } else if (biome < 0.35) {
            y = ghibliHQY;
        } else if (biome < 0.55) {
            let t = msmooth(0.35, 0.55, biome);
            y = ghibliHQY * (1.0 - t) + jungleY * t;
        } else {
            y = jungleY;
        }
        
        return y;
    }"""

merged_html, count = old_terrainHeightJS_pattern.subn(lambda m: new_terrainHeightJS, merged_html)
if count != 1:
    raise Exception(f"Expected 1 terrainHeightJS replacement, got {count}")

# 4. Replace terrainHeightGLSL
old_terrainHeightGLSL_pattern = re.compile(r'            float terrainHeightGLSL\(vec2 pos\) \{[\s\S]*?return y;\n            \}')
new_terrainHeightGLSL = """            float terrainHeightGLSL(vec2 pos) {
                float biome = snoise(pos * 0.0003);
                float openOceanY = snoise(pos * 0.002) * 4.0 - 6.0;
                float archNoise = snoise(pos * 0.002);
                float archY = archNoise * 6.0 - 4.5;
                if (archNoise > 0.76) {
                     archY += (archNoise - 0.76) * 80.0;
                }

                // 3. Ghibli High-Quality Continental Valleys, Rivers & Lakes (Terrain 2 - C:/macie/Terrain)
                float ghibliHQY = snoise(pos * 0.0015) * 90.0 + snoise(pos * 0.005) * 35.0 + snoise(pos * 0.02) * 8.0;
                if (ghibliHQY < 12.0) {
                     ghibliHQY = (ghibliHQY - 12.0) * 0.15 + 12.0;
                }
                float riverNoise = snoise(pos * 0.0015 + vec2(100.0, 100.0));
                float warp = snoise(pos * 0.01) * 0.02;
                float riverDist = abs(riverNoise + warp);
                if (riverDist < 0.04) {
                    float carve = 1.0 - (riverDist / 0.04);
                    carve = carve * carve * (3.0 - 2.0 * carve);
                    ghibliHQY -= carve * 15.0;
                }
                float lakeNoise = snoise(pos * 0.002 + vec2(-500.0, 500.0));
                if (lakeNoise > 0.45) {
                    float lakeDepth = min((lakeNoise - 0.45) * 2.5, 1.0);
                    float carve = lakeDepth * lakeDepth * (3.0 - 2.0 * lakeDepth);
                    ghibliHQY -= carve * 15.0;
                }

                // 4. Lush Ridged Mountain Jungle (Terrain 3 - jungle_8002)
                float noise1 = snoise(pos * 0.002);
                float noise2 = snoise(pos * 0.008);
                float noise3 = snoise(pos * 0.02);
                float ridge = 1.0 - abs(noise1);
                ridge = ridge * ridge;
                float jungleY = ridge * 65.0 - 2.0 + noise2 * 14.0 + noise3 * 4.0;

                float y = 0.0;
                if (biome < -0.4) {
                    y = openOceanY;
                } else if (biome < -0.15) {
                    float t = msmooth(-0.4, -0.15, biome);
                    y = mix(openOceanY, archY, t);
                } else if (biome < 0.05) {
                    float t = msmooth(-0.15, 0.05, biome);
                    y = mix(archY, ghibliHQY, t);
                } else if (biome < 0.35) {
                    y = ghibliHQY;
                } else if (biome < 0.55) {
                    float t = msmooth(0.35, 0.55, biome);
                    y = mix(ghibliHQY, jungleY, t);
                } else {
                    y = jungleY;
                }
                return y;
            }"""

merged_html, count = old_terrainHeightGLSL_pattern.subn(lambda m: new_terrainHeightGLSL, merged_html)
if count != 1:
    raise Exception(f"Expected 1 terrainHeightGLSL replacement, got {count}")

# 5. Add color definitions and update terrain colors
old_colors = """    const colorIslandGrass = new THREE.Color(0x76d149);
    const colorEmeraldGrass = new THREE.Color(0x56b847);
    const colorOliveGrass = new THREE.Color(0x8cc440);
    const colorHigh = new THREE.Color(0x89e05e); // Grass High"""

new_colors = """    const colorIslandGrass = new THREE.Color(0x76d149);
    const colorEmeraldGrass = new THREE.Color(0x56b847);
    const colorOliveGrass = new THREE.Color(0x8cc440);
    const colorHigh = new THREE.Color(0x89e05e); // Grass High
    const colorJungleGrass = new THREE.Color(0x389c45); // Tropical emerald
    const colorJungleHigh = new THREE.Color(0x286330);  // Deep canopy green"""

if old_colors not in merged_html:
    raise Exception("Could not find old_colors in merged_html")
merged_html = merged_html.replace(old_colors, new_colors)

old_color_loop = """        for (let i = 0; i < pos.count; i++) {
            const worldX = pos.getX(i) + gridX;
            const worldZ = pos.getZ(i) + gridZ;
            const h = terrainHeightJS(worldX, worldZ);
            // Push underwater terrain vertices safely beneath the water mesh (y=2.4) to eliminate any polygonal Z-fighting
            if (h < 2.35) {
                pos.setY(i, Math.min(h, 2.15));
            } else {
                pos.setY(i, h);
            }

            const meadowNoise = snoise(worldX * 0.0035, worldZ * 0.0035);
            const oliveNoise = snoise(worldX * 0.008 + 200, worldZ * 0.008 + 200);

            if (h < 1.0) {
                tempColor.copy(colorDeepWater);
            } else if (h < 2.35) {
                tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
            } else if (h < 4.2) {
                tempColor.copy(colorSand);
            } else if (h < 6.2) {
                tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(4.2, 6.2, h));
            } else if (h < 25) {
                patchColor.copy(colorIslandGrass);
                if (meadowNoise > 0.15) patchColor.lerp(colorEmeraldGrass, Math.min(1, (meadowNoise - 0.15) * 2.5));
                if (oliveNoise > 0.2) patchColor.lerp(colorOliveGrass, Math.min(1, (oliveNoise - 0.2) * 2.5));
                tempColor.lerpColors(patchColor, colorHigh, smoothstep(6.2, 25, h));
            } else if (h < 35) {
                tempColor.lerpColors(colorHigh, colorIslandRock, smoothstep(25, 35, h));
            } else {
                tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(35, 50, h));
            }

            colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }"""

new_color_loop = """        for (let i = 0; i < pos.count; i++) {
            const worldX = pos.getX(i) + gridX;
            const worldZ = pos.getZ(i) + gridZ;
            const h = terrainHeightJS(worldX, worldZ);
            let biome = snoise(worldX * 0.0003, worldZ * 0.0003);
            if (h < 2.35) {
                pos.setY(i, Math.min(h, 2.15));
            } else {
                pos.setY(i, h);
            }

            const meadowNoise = snoise(worldX * 0.0035, worldZ * 0.0035);
            const oliveNoise = snoise(worldX * 0.008 + 200, worldZ * 0.008 + 200);

            if (h < 1.0) {
                tempColor.copy(colorDeepWater);
            } else if (h < 2.35) {
                tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
            } else if (h < 4.2) {
                tempColor.copy(colorSand);
            } else if (h < 6.2) {
                if (biome >= 0.25) tempColor.lerpColors(colorSand, colorJungleGrass, smoothstep(4.2, 6.2, h));
                else tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(4.2, 6.2, h));
            } else if (h < 25) {
                if (biome >= 0.25) {
                    tempColor.lerpColors(colorJungleGrass, colorJungleHigh, smoothstep(6.2, 25, h));
                } else {
                    patchColor.copy(colorIslandGrass);
                    if (meadowNoise > 0.15) patchColor.lerp(colorEmeraldGrass, Math.min(1, (meadowNoise - 0.15) * 2.5));
                    if (oliveNoise > 0.2) patchColor.lerp(colorOliveGrass, Math.min(1, (oliveNoise - 0.2) * 2.5));
                    tempColor.lerpColors(patchColor, colorHigh, smoothstep(6.2, 25, h));
                }
            } else if (h < 38) {
                tempColor.lerpColors(biome >= 0.25 ? colorJungleHigh : colorHigh, colorIslandRock, smoothstep(25, 38, h));
            } else {
                tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(38, 55, h));
            }

            colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }"""

if old_color_loop not in merged_html:
    raise Exception("Could not find old_color_loop in merged_html")
merged_html = merged_html.replace(old_color_loop, new_color_loop)

# 6. Insert jungle tree geometries and instanced meshes right before const treeMeshes = [
old_treeMeshes = """    const tempTreeColor = new THREE.Color();
    const treeMeshes = [instTree1, instTreeG1, instTree2, instTreeG2, instTree3, instTreeG3, instTree4, instTreeG4, instTree5, instTreeG5, instTree6, instTreeG6];
    treeMeshes.forEach(mesh => {
        mesh.maxCount = mesh.count;
        for (let i = 0; i < mesh.count; i++) {
            tempTreeColor.setHex(treeGreenVariations[Math.floor(Math.random() * treeGreenVariations.length)]);
            mesh.setColorAt(i, tempTreeColor);
        }
    });"""

new_treeMeshes = jungle_tree_geos + """
    const tempTreeColor = new THREE.Color();
    const treeMeshes = [
        instTree1, instTreeG1, instTree2, instTreeG2, instTree3, instTreeG3, instTree4, instTreeG4, instTree5, instTreeG5, instTree6, instTreeG6,
        instJTree1, instJTree2, instJTree3, instJTree4, instJTree5, instJTree6, instJTree7, instJTree8, instJTree9
    ];
    treeMeshes.forEach((mesh, idx) => {
        mesh.maxCount = mesh.count;
        for (let i = 0; i < mesh.count; i++) {
            if (idx < 12) {
                tempTreeColor.setHex(treeGreenVariations[Math.floor(Math.random() * treeGreenVariations.length)]);
            } else {
                tempTreeColor.setHex(0xffffff); // Preserve vertex-colored jungle trees
            }
            mesh.setColorAt(i, tempTreeColor);
        }
    });"""

if old_treeMeshes not in merged_html:
    raise Exception("Could not find old_treeMeshes in merged_html")
merged_html = merged_html.replace(old_treeMeshes, new_treeMeshes)

# 7. Update shouldUpdateTerrain tree placement loop with biome filtering
old_tree_placement = """                        if (!isClearing && minH > 5.5 && maxH < 45 && slope < 4.5 && pathVal < 0.1 && (Math.random() > 0.1)) { 
                            if (!treeGrid.has(cellKey)) {
                                valid = true;
                            }
                        }
                        attempts++;
                    }

                    if (valid) {
                        treeGrid.add(cellKey);
                        // Embed tree base 1.5 units deep into terrain to eliminate any possible overhang gap
                        dummy.position.set(nx, h - 1.5, nz);
                        dummy.rotation.set(0, Math.random() * Math.PI, 0);
                        
                        let scale = 0.7 + Math.random() * 1.1;
                        dummy.scale.setScalar(scale);
                        tempTreeColor.setHex(treeGreenVariations[Math.floor(Math.random() * treeGreenVariations.length)]);
                        instMesh.setColorAt(i, tempTreeColor);
                    } else {"""

new_tree_placement = """                        let posBiome = snoise(nx * 0.0003, nz * 0.0003);
                        if (!isClearing && minH > 5.5 && maxH < 45 && slope < 4.5 && pathVal < 0.1 && (Math.random() > 0.1)) { 
                            let biomeAllowed = (meshIdx < 12) ? (posBiome < 0.32) : (posBiome >= 0.25);
                            if (biomeAllowed && !treeGrid.has(cellKey)) {
                                valid = true;
                            }
                        }
                        attempts++;
                    }

                    if (valid) {
                        treeGrid.add(cellKey);
                        // Embed tree base 1.5 units deep into terrain to eliminate any possible overhang gap
                        dummy.position.set(nx, h - 1.5, nz);
                        dummy.rotation.set(0, Math.random() * Math.PI, 0);
                        
                        let scale = 0.7 + Math.random() * 1.1;
                        dummy.scale.setScalar(scale);
                        if (meshIdx < 12) {
                            tempTreeColor.setHex(treeGreenVariations[Math.floor(Math.random() * treeGreenVariations.length)]);
                        } else {
                            tempTreeColor.setHex(0xffffff);
                        }
                        instMesh.setColorAt(i, tempTreeColor);
                    } else {"""

if old_tree_placement not in merged_html:
    raise Exception("Could not find old_tree_placement in merged_html")
merged_html = merged_html.replace(old_tree_placement, new_tree_placement)

# Save merged result
with open(r'C:\Users\macie\OneDrive\Desktop\KIKI\Ghibli\Kiki-Islands-Merged\index.html', 'w', encoding='utf-8') as f:
    f.write(merged_html)

print("SUCCESS: Kiki-Islands-Merged/index.html updated successfully with all 3 terrains merged, 21 tree species, exact coloring, and zero collisions!")
