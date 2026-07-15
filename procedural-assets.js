import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// --- SHADER DEFINITIONS ---

export const ToonVertexShader = `
  uniform float uTime;
  uniform float uWindEnabled;
  uniform float uWindSwayStrength;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    if (uWindEnabled > 0.5) {
      // Wind sway formula: depends on height of vertex
      float sway = sin(uTime * 2.5 + pos.y * 0.8 + pos.x * 0.2) * cos(uTime * 1.2 + pos.z * 0.3);
      float heightFactor = max(0.0, pos.y); 
      pos.x += sway * 0.08 * heightFactor * uWindSwayStrength;
      pos.z += sway * 0.05 * heightFactor * uWindSwayStrength;
    }
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ToonFragmentShader = `
  uniform float uToonEnabled;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uAmbientColor;
  uniform vec3 uBaseColor;
  uniform vec3 uRimColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(uLightDir);

    vec3 color;

    if (uToonEnabled > 0.5) {
      // Toon shading: 3-tone
      float NdotL = dot(normal, lightDir);
      float intensity = NdotL * 0.5 + 0.5; // range 0 to 1
      
      float toonIntensity;
      if (intensity > 0.75) {
        toonIntensity = 1.0;
      } else if (intensity > 0.4) {
        toonIntensity = 0.65;
      } else {
        toonIntensity = 0.3;
      }
      
      vec3 diffuse = uLightColor * toonIntensity;
      
      // Rim lighting
      float rim = 1.0 - max(0.0, dot(normal, viewDir));
      float rimDot = max(0.0, dot(normal, lightDir));
      float rimIntensity = pow(rim, 4.0) * rimDot;
      vec3 rimLight = vec3(0.0);
      if (rimIntensity > 0.3) {
        rimLight = uRimColor * 0.5;
      }

      color = uBaseColor * (uAmbientColor + diffuse) + rimLight;
    } else {
      // Flat color look
      color = uBaseColor;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const OutlineVertexShader = `
  uniform float uOutlineWidth;
  uniform float uTime;
  uniform float uWindEnabled;
  uniform float uWindSwayStrength;

  void main() {
    vec3 pos = position;
    if (uWindEnabled > 0.5) {
      float sway = sin(uTime * 2.5 + pos.y * 0.8 + pos.x * 0.2) * cos(uTime * 1.2 + pos.z * 0.3);
      float heightFactor = max(0.0, pos.y);
      pos.x += sway * 0.08 * heightFactor * uWindSwayStrength;
      pos.z += sway * 0.05 * heightFactor * uWindSwayStrength;
    }
    // Offset along normal
    pos += normal * uOutlineWidth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const OutlineFragmentShader = `
  uniform float uToonEnabled;
  uniform vec3 uOutlineColor;
  
  void main() {
    if (uToonEnabled < 0.5) {
      discard;
    }
    gl_FragColor = vec4(uOutlineColor, 1.0);
  }
`;

// --- SHADER HELPERS ---

export function overrideNormals(geometry, center) {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  if (!posAttr || !normAttr) return;
  const tempPos = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    tempPos.fromBufferAttribute(posAttr, i);
    const dir = new THREE.Vector3().subVectors(tempPos, center).normalize();
    normAttr.setXYZ(i, dir.x, dir.y, dir.z);
  }
  normAttr.needsUpdate = true;
}

export function createToonMesh(geometry, baseColor, outlineWidth, globalUniforms) {
  const toonMat = new THREE.ShaderMaterial({
    vertexShader: ToonVertexShader,
    fragmentShader: ToonFragmentShader,
    uniforms: {
      ...globalUniforms,
      uBaseColor: { value: new THREE.Color(baseColor) },
      uRimColor: { value: new THREE.Color(0xffffff) }
    }
  });

  const mainMesh = new THREE.Mesh(geometry, toonMat);

  const outlineMat = new THREE.ShaderMaterial({
    vertexShader: OutlineVertexShader,
    fragmentShader: OutlineFragmentShader,
    uniforms: {
      ...globalUniforms,
      uOutlineWidth: { value: outlineWidth },
      uOutlineColor: { value: new THREE.Color(0x130b02) }
    },
    side: THREE.BackSide
  });

  const outlineMesh = new THREE.Mesh(geometry, outlineMat);
  outlineMesh.name = "outline";
  mainMesh.add(outlineMesh);

  return mainMesh;
}

// --- CREATOR UTILITIES ---

function createPlaceholderAsset(name, biome, globalUniforms) {
  const group = new THREE.Group();
  group.name = name;

  // Trunk
  const trunkGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
  trunkGeo.translate(0, 0.5, 0);
  const trunkMesh = createToonMesh(trunkGeo, 0x705335, 0.02, globalUniforms);
  trunkMesh.material.uniforms.uWindSwayStrength.value = 0.0;
  if (trunkMesh.children[0]) {
    trunkMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.0;
  }
  group.add(trunkMesh);

  // Foliage
  const foliageGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  foliageGeo.translate(0, 1.5, 0);
  
  let foliageColor = 0x76c043;
  if (biome === 'Jungle') foliageColor = 0x1a5e3a;
  else if (biome === 'Archipelago') foliageColor = 0x2e8b9a;
  else if (biome === 'Ghibli Land') foliageColor = 0x76c043;
  else if (biome === 'Plains') foliageColor = 0xd2b48c;
  else if (biome === 'Mountains') foliageColor = 0xa0b0be;
  else if (biome === 'Magical') foliageColor = 0x9370db;

  const foliageMesh = createToonMesh(foliageGeo, foliageColor, 0.03, globalUniforms);
  foliageMesh.material.uniforms.uWindSwayStrength.value = 0.6;
  if (foliageMesh.children[0]) {
    foliageMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.6;
  }
  group.add(foliageMesh);

  return group;
}

// --- FLAGSHIP 1: GHIBLI SUMMER OAK ---
function generateGhibliSummerOak(globalUniforms) {
  const group = new THREE.Group();
  group.name = "Ghibli Summer Oak";

  // 1. Build organic trunk using cylinder stacking
  const trunkGeometries = [];
  
  // Base flared segment
  const baseGeo = new THREE.CylinderGeometry(0.65, 1.0, 1.6, 8);
  baseGeo.translate(0, 0.8, 0);
  trunkGeometries.push(baseGeo);
  
  // Middle segment leaning slightly right
  const midGeo = new THREE.CylinderGeometry(0.5, 0.65, 1.6, 8);
  midGeo.translate(0, 0.8, 0);
  midGeo.rotateZ(0.06);
  midGeo.translate(0.05, 1.5, 0);
  trunkGeometries.push(midGeo);

  // Top segment leaning back a bit
  const topGeo = new THREE.CylinderGeometry(0.38, 0.5, 1.6, 8);
  topGeo.translate(0, 0.8, 0);
  topGeo.rotateZ(-0.04);
  topGeo.rotateX(0.05);
  topGeo.translate(0.08, 3.0, 0.05);
  trunkGeometries.push(topGeo);

  // 4 flared organic base roots
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const flareGeo = new THREE.CylinderGeometry(0.2, 0.6, 0.9, 6);
    flareGeo.translate(0, 0.45, 0);
    flareGeo.rotateX(0.45);
    flareGeo.rotateY(angle);
    flareGeo.translate(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
    trunkGeometries.push(flareGeo);
  }

  // Trunk split branch 1
  const br1 = new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6);
  br1.translate(0, 0.9, 0);
  br1.rotateZ(0.65);
  br1.rotateY(0.4);
  br1.translate(0.2, 2.7, 0.1);
  trunkGeometries.push(br1);

  // Trunk split branch 2
  const br2 = new THREE.CylinderGeometry(0.14, 0.24, 1.6, 6);
  br2.translate(0, 0.8, 0);
  br2.rotateZ(-0.75);
  br2.rotateY(-0.8);
  br2.translate(-0.2, 3.3, -0.15);
  trunkGeometries.push(br2);

  const mergedTrunkGeo = BufferGeometryUtils.mergeGeometries(trunkGeometries);
  const trunkMesh = createToonMesh(mergedTrunkGeo, 0x664c3f, 0.02, globalUniforms);
  // Trunk does not sway much
  trunkMesh.material.uniforms.uWindSwayStrength.value = 0.15;
  if (trunkMesh.children[0]) {
    trunkMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.15;
  }
  group.add(trunkMesh);

  // 2. Build fluffy canopy using overlapping dodecahedrons
  const canopyGeometries = [];
  const foliagePoints = [
    { pos: [0.15, 4.8, 0.05], rad: 1.7 },
    { pos: [-1.2, 4.0, -0.7], rad: 1.3 },
    { pos: [1.4, 3.8, 0.8], rad: 1.4 },
    { pos: [0.4, 4.3, 1.2], rad: 1.15 },
    { pos: [-0.4, 4.4, -1.2], rad: 1.25 }
  ];

  foliagePoints.forEach(p => {
    const leafGeo = new THREE.DodecahedronGeometry(p.rad, 1);
    leafGeo.translate(p.pos[0], p.pos[1], p.pos[2]);
    canopyGeometries.push(leafGeo);
  });

  const mergedCanopyGeo = BufferGeometryUtils.mergeGeometries(canopyGeometries);

  // 3. Override normal vectors to point outward from center of canopy cluster
  mergedCanopyGeo.computeBoundingBox();
  const canopyCenter = new THREE.Vector3();
  mergedCanopyGeo.boundingBox.getCenter(canopyCenter);
  overrideNormals(mergedCanopyGeo, canopyCenter);

  const canopyMesh = createToonMesh(mergedCanopyGeo, 0x4fa85c, 0.035, globalUniforms);
  // Canopy sways heavily in wind
  canopyMesh.material.uniforms.uWindSwayStrength.value = 0.9;
  if (canopyMesh.children[0]) {
    canopyMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.9;
  }
  group.add(canopyMesh);

  return group;
}

// --- FLAGSHIP 2: THE WINDSWEPT PINE ---
function generateWindsweptPine(globalUniforms) {
  const group = new THREE.Group();
  group.name = "Windswept Pine";

  // 1. Build curved, highly angled trunk showing wind directional growth (+X)
  const trunkGeometries = [];
  
  // Segment 1 (lean start)
  const s1 = new THREE.CylinderGeometry(0.48, 0.6, 1.2, 8);
  s1.translate(0, 0.6, 0);
  s1.rotateZ(-0.18);
  trunkGeometries.push(s1);

  // Segment 2 (lean further)
  const s2 = new THREE.CylinderGeometry(0.38, 0.48, 1.2, 8);
  s2.translate(0, 0.6, 0);
  s2.rotateZ(-0.35);
  s2.translate(0.18, 1.15, 0);
  trunkGeometries.push(s2);

  // Segment 3 (sharp lean)
  const s3 = new THREE.CylinderGeometry(0.28, 0.38, 1.2, 8);
  s3.translate(0, 0.6, 0);
  s3.rotateZ(-0.52);
  s3.translate(0.55, 2.05, 0);
  trunkGeometries.push(s3);

  // Segment 4 (Top leaning heavily)
  const s4 = new THREE.CylinderGeometry(0.16, 0.28, 1.1, 8);
  s4.translate(0, 0.55, 0);
  s4.rotateZ(-0.7);
  s4.translate(1.1, 2.8, 0);
  trunkGeometries.push(s4);

  // Leeward branch 1 (low)
  const b1 = new THREE.CylinderGeometry(0.08, 0.18, 1.6, 6);
  b1.translate(0, 0.8, 0);
  b1.rotateZ(-1.05);
  b1.rotateY(0.25);
  b1.translate(1.2, 2.3, 0.15);
  trunkGeometries.push(b1);

  // Leeward branch 2 (high)
  const b2 = new THREE.CylinderGeometry(0.06, 0.14, 1.3, 6);
  b2.translate(0, 0.65, 0);
  b2.rotateZ(-1.15);
  b2.rotateY(-0.35);
  b2.translate(2.1, 3.0, -0.25);
  trunkGeometries.push(b2);

  const mergedTrunkGeo = BufferGeometryUtils.mergeGeometries(trunkGeometries);
  const trunkMesh = createToonMesh(mergedTrunkGeo, 0x4c3c35, 0.02, globalUniforms);
  trunkMesh.material.uniforms.uWindSwayStrength.value = 0.2;
  if (trunkMesh.children[0]) {
    trunkMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.2;
  }
  group.add(trunkMesh);

  // 2. Flat horizontal foliage pads primarily on leeward (+X) side
  const canopyGeometries = [];
  const pads = [
    { pos: [2.3, 2.35, 0.35], scale: [1.7, 0.35, 1.35] },
    { pos: [3.2, 3.15, -0.3], scale: [1.5, 0.35, 1.15] },
    { pos: [3.6, 3.8, 0.15], scale: [1.8, 0.35, 1.5] }
  ];

  pads.forEach(p => {
    const padGeo = new THREE.DodecahedronGeometry(0.9, 1);
    padGeo.scale(p.scale[0], p.scale[1], p.scale[2]);
    padGeo.translate(p.pos[0], p.pos[1], p.pos[2]);
    canopyGeometries.push(padGeo);
  });

  const mergedCanopyGeo = BufferGeometryUtils.mergeGeometries(canopyGeometries);

  // Apply normal-averaging outwards from overall canopy center
  mergedCanopyGeo.computeBoundingBox();
  const canopyCenter = new THREE.Vector3();
  mergedCanopyGeo.boundingBox.getCenter(canopyCenter);
  overrideNormals(mergedCanopyGeo, canopyCenter);

  const canopyMesh = createToonMesh(mergedCanopyGeo, 0x2e6945, 0.035, globalUniforms);
  canopyMesh.material.uniforms.uWindSwayStrength.value = 0.7;
  if (canopyMesh.children[0]) {
    canopyMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.7;
  }
  group.add(canopyMesh);

  return group;
}

// --- FLAGSHIP 3: THE WIZARD SPIRE ---
function generateWizardSpire(globalUniforms) {
  const group = new THREE.Group();
  group.name = "Wizard Spire";

  // 1. Stylized stone turret base
  const baseGeometries = [];
  const turretGeo = new THREE.CylinderGeometry(0.85, 1.05, 3.0, 10);
  turretGeo.translate(0, 1.5, 0);
  baseGeometries.push(turretGeo);
  
  // Base trim
  const trimGeo = new THREE.CylinderGeometry(1.1, 1.15, 0.45, 10);
  trimGeo.translate(0, 0.225, 0);
  baseGeometries.push(trimGeo);

  // Mid trim
  const midTrimGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.2, 10);
  midTrimGeo.translate(0, 2.5, 0);
  baseGeometries.push(midTrimGeo);

  const mergedBaseGeo = BufferGeometryUtils.mergeGeometries(baseGeometries);
  const baseMesh = createToonMesh(mergedBaseGeo, 0x7b7a82, 0.025, globalUniforms);
  // Stone does not sway in the wind!
  baseMesh.material.uniforms.uWindSwayStrength.value = 0.0;
  if (baseMesh.children[0]) {
    baseMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.0;
  }
  group.add(baseMesh);

  // 2. Small hand-painted looking rectangular windows emitting warm glow (Basic unlit material)
  const windowColor = 0xffa500; // Orange-yellow warm glow
  const windowGeometries = [
    { pos: [0.93 * Math.sin(0.4), 1.3, 0.93 * Math.cos(0.4)], rot: 0.4, size: [0.15, 0.35, 0.08] },
    { pos: [0.89 * Math.sin(-0.7), 2.1, 0.89 * Math.cos(-0.7)], rot: -0.7, size: [0.12, 0.3, 0.08] },
    { pos: [0.91 * Math.sin(2.3), 1.7, 0.91 * Math.cos(2.3)], rot: 2.3, size: [0.15, 0.35, 0.08] }
  ];

  windowGeometries.forEach(w => {
    const winGeo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
    winGeo.translate(0, 0, 0.04);
    winGeo.rotateY(w.rot);
    winGeo.translate(w.pos[0], w.pos[1], w.pos[2]);

    const winMesh = createToonMesh(winGeo, windowColor, 0.01, globalUniforms);
    // Glow windows are unlit - disable toon shadows by overriding uniforms
    winMesh.material.uniforms.uRimColor.value.set(0xffa500);
    winMesh.material.uniforms.uWindSwayStrength.value = 0.0;
    if (winMesh.children[0]) {
      winMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.0;
    }
    group.add(winMesh);
  });

  // 3. Steep cone-shaped roof with slightly offset, layered tiling
  const roofGeometries = [];
  
  // Layer 1 (bottom roof tier)
  const r1 = new THREE.ConeGeometry(1.2, 1.1, 8);
  r1.translate(0, 0.55, 0);
  r1.rotateZ(0.04);
  r1.translate(0, 2.9, 0);
  roofGeometries.push(r1);

  // Layer 2 (middle roof tier)
  const r2 = new THREE.ConeGeometry(0.85, 1.1, 8);
  r2.translate(0, 0.55, 0);
  r2.rotateZ(-0.03);
  r2.rotateY(0.65);
  r2.translate(0.02, 3.65, -0.02);
  roofGeometries.push(r2);

  // Layer 3 (top peak)
  const r3 = new THREE.ConeGeometry(0.48, 1.3, 8);
  r3.translate(0, 0.65, 0);
  r3.rotateZ(0.05);
  r3.rotateY(-0.4);
  r3.translate(-0.03, 4.4, 0.03);
  roofGeometries.push(r3);

  const mergedRoofGeo = BufferGeometryUtils.mergeGeometries(roofGeometries);
  const roofMesh = createToonMesh(mergedRoofGeo, 0x42385e, 0.025, globalUniforms);
  roofMesh.material.uniforms.uWindSwayStrength.value = 0.0;
  if (roofMesh.children[0]) {
    roofMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.0;
  }
  group.add(roofMesh);

  // 4. Detached, floating stone ring floating around its midsection
  const ringGeo = new THREE.TorusGeometry(1.4, 0.12, 6, 20);
  ringGeo.rotateX(Math.PI / 2); // Make it horizontal
  
  const ringMesh = createToonMesh(ringGeo, 0x5a83a0, 0.025, globalUniforms);
  ringMesh.position.y = 1.8;
  ringMesh.material.uniforms.uWindSwayStrength.value = 0.0;
  if (ringMesh.children[0]) {
    ringMesh.children[0].material.uniforms.uWindSwayStrength.value = 0.0;
  }
  group.add(ringMesh);

  // Store in userData for animation update
  group.userData = {
    floatingRing: ringMesh
  };

  return group;
}

// --- REGISTRY DICTIONARY OF 40 ASSETS ---

export const AssetRegistry = [
  // --- Jungle (7) ---
  {
    id: "giant-fern",
    name: "Giant Fern",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Giant Fern", "Jungle", globalUniforms)
  },
  {
    id: "strangler-fig",
    name: "Strangler Fig",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Strangler Fig", "Jungle", globalUniforms)
  },
  {
    id: "bromeliad-tree",
    name: "Bromeliad Tree",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Bromeliad Tree", "Jungle", globalUniforms)
  },
  {
    id: "kapok-tree",
    name: "Kapok Tree",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Kapok Tree", "Jungle", globalUniforms)
  },
  {
    id: "canopy-vine-cluster",
    name: "Canopy Vine Cluster",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Canopy Vine Cluster", "Jungle", globalUniforms)
  },
  {
    id: "jungle-palm",
    name: "Jungle Palm",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Jungle Palm", "Jungle", globalUniforms)
  },
  {
    id: "mossy-log",
    name: "Mossy Log",
    biome: "Jungle",
    generate: (globalUniforms) => createPlaceholderAsset("Mossy Log", "Jungle", globalUniforms)
  },

  // --- Archipelago (7) ---
  {
    id: "windswept-pine",
    name: "Windswept Pine",
    biome: "Archipelago",
    isFlagship: true,
    generate: (globalUniforms) => generateWindsweptPine(globalUniforms)
  },
  {
    id: "coconut-palm",
    name: "Coconut Palm",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Coconut Palm", "Archipelago", globalUniforms)
  },
  {
    id: "coastal-shrub",
    name: "Coastal Shrub",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Coastal Shrub", "Archipelago", globalUniforms)
  },
  {
    id: "bent-palm",
    name: "Bent Palm",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Bent Palm", "Archipelago", globalUniforms)
  },
  {
    id: "mangrove-root-node",
    name: "Mangrove Root Node",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Mangrove Root Node", "Archipelago", globalUniforms)
  },
  {
    id: "coral-shrub",
    name: "Coral Shrub",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Coral Shrub", "Archipelago", globalUniforms)
  },
  {
    id: "shore-grass-tuft",
    name: "Shore Grass Tuft",
    biome: "Archipelago",
    generate: (globalUniforms) => createPlaceholderAsset("Shore Grass Tuft", "Archipelago", globalUniforms)
  },

  // --- Ghibli Land (7) ---
  {
    id: "ghibli-summer-oak",
    name: "Ghibli Summer Oak",
    biome: "Ghibli Land",
    isFlagship: true,
    generate: (globalUniforms) => generateGhibliSummerOak(globalUniforms)
  },
  {
    id: "totoro-puffball-tree",
    name: "Totoro Puffball Tree",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Totoro Puffball Tree", "Ghibli Land", globalUniforms)
  },
  {
    id: "fluffy-meadow-shrub",
    name: "Fluffy Meadow Shrub",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Fluffy Meadow Shrub", "Ghibli Land", globalUniforms)
  },
  {
    id: "sprout-sapling",
    name: "Sprout Sapling",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Sprout Sapling", "Ghibli Land", globalUniforms)
  },
  {
    id: "hollow-tree-stump",
    name: "Hollow Tree Stump",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Hollow Tree Stump", "Ghibli Land", globalUniforms)
  },
  {
    id: "weeping-willow",
    name: "Weeping Willow",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Weeping Willow", "Ghibli Land", globalUniforms)
  },
  {
    id: "mossy-boulder",
    name: "Mossy Boulder",
    biome: "Ghibli Land",
    generate: (globalUniforms) => createPlaceholderAsset("Mossy Boulder", "Ghibli Land", globalUniforms)
  },

  // --- Plains (6) ---
  {
    id: "golden-wheat-tuft",
    name: "Golden Wheat Tuft",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Golden Wheat Tuft", "Plains", globalUniforms)
  },
  {
    id: "solitary-acacia",
    name: "Solitary Acacia",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Solitary Acacia", "Plains", globalUniforms)
  },
  {
    id: "low-meadow-bush",
    name: "Low Meadow Bush",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Low Meadow Bush", "Plains", globalUniforms)
  },
  {
    id: "tall-prairie-grass",
    name: "Tall Prairie Grass",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Tall Prairie Grass", "Plains", globalUniforms)
  },
  {
    id: "bramble-bush",
    name: "Bramble Bush",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Bramble Bush", "Plains", globalUniforms)
  },
  {
    id: "plains-elm",
    name: "Plains Elm",
    biome: "Plains",
    generate: (globalUniforms) => createPlaceholderAsset("Plains Elm", "Plains", globalUniforms)
  },

  // --- Mountains (6) ---
  {
    id: "alpine-fir",
    name: "Alpine Fir",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Alpine Fir", "Mountains", globalUniforms)
  },
  {
    id: "mountain-pine",
    name: "Mountain Pine",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Mountain Pine", "Mountains", globalUniforms)
  },
  {
    id: "snowy-shrub",
    name: "Snowy Shrub",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Snowy Shrub", "Mountains", globalUniforms)
  },
  {
    id: "cliff-bonsai",
    name: "Cliff Bonsai",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Cliff Bonsai", "Mountains", globalUniforms)
  },
  {
    id: "tundra-moss-patch",
    name: "Tundra Moss Patch",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Tundra Moss Patch", "Mountains", globalUniforms)
  },
  {
    id: "basalt-column-group",
    name: "Basalt Column Group",
    biome: "Mountains",
    generate: (globalUniforms) => createPlaceholderAsset("Basalt Column Group", "Mountains", globalUniforms)
  },

  // --- Magical (7) ---
  {
    id: "wizard-spire",
    name: "Wizard Spire",
    biome: "Magical",
    isFlagship: true,
    generate: (globalUniforms) => generateWizardSpire(globalUniforms)
  },
  {
    id: "glowing-mushroom",
    name: "Glowing Mushroom",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Glowing Mushroom", "Magical", globalUniforms)
  },
  {
    id: "crystal-cluster",
    name: "Crystal Cluster",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Crystal Cluster", "Magical", globalUniforms)
  },
  {
    id: "mana-flower",
    name: "Mana Flower",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Mana Flower", "Magical", globalUniforms)
  },
  {
    id: "floating-rune-stone",
    name: "Floating Rune Stone",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Floating Rune Stone", "Magical", globalUniforms)
  },
  {
    id: "whispering-willow",
    name: "Whispering Willow",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Whispering Willow", "Magical", globalUniforms)
  },
  {
    id: "star-leaf-vine",
    name: "Star-leaf Vine",
    biome: "Magical",
    generate: (globalUniforms) => createPlaceholderAsset("Star-leaf Vine", "Magical", globalUniforms)
  }
];
