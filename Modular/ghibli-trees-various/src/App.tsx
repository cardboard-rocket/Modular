import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TreeParams } from './types';
import { generateCustomTree } from './procedural-assets';

// --- Procedural Generation Logic ---

const createToonGradientMap = () => {
  const colors = new Uint8Array([70, 150, 255]); // Dark, mid, light
  const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  gradientMap.needsUpdate = true;
  return gradientMap;
};

const toonGradient = createToonGradientMap();

const createMaterial = (colorHex: number, isFoliage: boolean, useVertexColors = false) => {
  const mat = new THREE.MeshToonMaterial({
    color: useVertexColors ? 0xffffff : colorHex,
    gradientMap: toonGradient,
    vertexColors: useVertexColors,
  });
  
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.shader = shader; // Essential fix for uTime updates
    
    shader.vertexShader = `
      uniform float uTime;
      attribute float isFoliage;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      if (isFoliage > 0.5) {
        float t = uTime * 2.0;
        float sway = sin(t + position.y * 0.5 + position.x * 0.5) * 0.05 * position.y;
        transformed.x += sway;
        transformed.z += cos(t + position.y * 0.5) * 0.05 * position.y;
      }
      `
    );
  };
  return mat;
};

const tagFoliage = (geometry: THREE.BufferGeometry, isFoliage: number) => {
  const count = geometry.attributes.position.count;
  const arr = new Float32Array(count);
  arr.fill(isFoliage);
  geometry.setAttribute('isFoliage', new THREE.BufferAttribute(arr, 1));
};

const averageNormals = (geometry: THREE.BufferGeometry, center: THREE.Vector3) => {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  if (!pos || !norm) return;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - center.x;
    const dy = pos.getY(i) - center.y;
    const dz = pos.getZ(i) - center.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 0) {
      norm.setXYZ(i, dx / len, dy / len, dz / len);
    }
  }
  norm.needsUpdate = true;
};

// --- Curved Trunk / Branch Building Helpers ---

const createSegmentMesh = (
  radiusBottom: number,
  radiusTop: number,
  height: number,
  startPoint: THREE.Vector3,
  direction: THREE.Vector3,
  material: THREE.Material
) => {
  const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8, 1);
  tagFoliage(geom, 0.0);
  
  // Center cylinder geometry so its bottom is at (0, 0, 0)
  geom.translate(0, height / 2, 0);
  
  // Align cylinder with direction vector
  const alignDir = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(alignDir, direction.clone().normalize());
  
  const mesh = new THREE.Mesh(geom, material);
  mesh.quaternion.copy(quaternion);
  mesh.position.copy(startPoint);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const getGhibliGradientColor = (y: number, minY: number, maxY: number) => {
  const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
  
  // Bottom: deep, cool forest teal-blue-green
  const c1 = new THREE.Color(0x011b18);
  // Middle: vibrant grass green
  const c2 = new THREE.Color(0x19a349);
  // Top: warm, sun-kissed pale-yellow simulating bright sunlight
  const c3 = new THREE.Color(0xf3f596);
  
  const finalColor = new THREE.Color();
  if (t < 0.4) {
    const factor = t / 0.4;
    finalColor.lerpColors(c1, c2, factor);
  } else {
    const factor = (t - 0.4) / 0.6;
    finalColor.lerpColors(c2, c3, factor);
  }
  return finalColor;
};

const applyFoliageColors = (geometry: THREE.BufferGeometry, minY: number, maxY: number, isPine = false) => {
  const pos = geometry.attributes.position;
  if (!pos) return;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    let color: THREE.Color;
    if (isPine) {
      // Pine Color Palette: rich, desaturated, deep marine-black/green for shadows, transitioning to sea-green highlight
      const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
      const c1 = new THREE.Color(0x01140e); // Deep marine-black/green shadow
      const c2 = new THREE.Color(0x092e1f); // Rich mid evergreen
      const c3 = new THREE.Color(0x286e52); // Cool sea-green highlight
      color = new THREE.Color();
      if (t < 0.35) {
        color.lerpColors(c1, c2, t / 0.35);
      } else {
        color.lerpColors(c2, c3, (t - 0.35) / 0.65);
      }
    } else {
      color = getGhibliGradientColor(y, minY, maxY);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

// Bezier utilities for pine
const getBezierPoint = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number) => {
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
  const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
  const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z;
  return new THREE.Vector3(x, y, z);
};

const getBezierTangent = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number) => {
  const oneMinusT = 1 - t;
  const dx = 2 * oneMinusT * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * oneMinusT * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const dz = 2 * oneMinusT * (p1.z - p0.z) + 2 * t * (p2.z - p1.z);
  return new THREE.Vector3(dx, dy, dz).normalize();
};

const createPineMicroClusterPad = (center: THREE.Vector3, padScale: THREE.Vector3, count = 4) => {
  const geoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    // 3-4 tiny, flat-scaled overlapping spheres grouped together
    const size = 0.38 + Math.random() * 0.32;
    const geom = new THREE.DodecahedronGeometry(size, 1);
    
    // Scale flattened but fluffy
    geom.scale(
      padScale.x * (0.8 + Math.random() * 0.4),
      padScale.y * (0.7 + Math.random() * 0.3),
      padScale.z * (0.8 + Math.random() * 0.4)
    );
    
    // Offset slightly around central pad center to create a plump, asymmetrical cushion
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const radius = 0.35 + Math.random() * 0.3;
    
    const dx = Math.cos(angle) * radius;
    const dy = (Math.random() - 0.5) * 0.12;
    const dz = Math.sin(angle) * radius;
    
    geom.translate(center.x + dx, center.y + dy, center.z + dz);
    geoms.push(geom);
  }
  return geoms;
};

const generateOak = () => {
  const group = new THREE.Group();
  const trunkMat = createMaterial(0x5c4033, false);
  const leafMat = createMaterial(0x2e8b57, true, true); // Use vertex colors!

  // 1. Generate Organic Curved Segmented Trunk
  const trunkSegmentsCount = 5;
  const segmentHeight = 0.48;
  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDir = new THREE.Vector3(0, 1, 0);
  
  for (let i = 0; i < trunkSegmentsCount; i++) {
    // Taper from root to tip
    let rBottom = 0.72 - (i * 0.06);
    let rTop = 0.72 - ((i + 1) * 0.06);
    
    // Root flare for the lowest segment
    if (i === 0) {
      rBottom = 1.45;
      rTop = 0.82;
    } else if (i === 1) {
      rBottom = 0.82;
      rTop = 0.68;
    }
    
    // Tilt trunk slightly for organic curve
    if (i > 0) {
      currentDir.x += Math.sin(i * 1.2) * 0.09;
      currentDir.z += Math.cos(i * 1.0) * 0.07;
      currentDir.normalize();
    }
    
    const segment = createSegmentMesh(rBottom, rTop, segmentHeight, currentPos, currentDir, trunkMat);
    group.add(segment);
    
    // Advance position
    currentPos.add(currentDir.clone().multiplyScalar(segmentHeight));
  }
  
  // Add supporting root flares crawling out from base
  const flareCount = 5;
  for (let f = 0; f < flareCount; f++) {
    const angle = (f / flareCount) * Math.PI * 2;
    const flareDir = new THREE.Vector3(Math.cos(angle), 0.1, Math.sin(angle)).normalize();
    const flareStart = new THREE.Vector3(Math.cos(angle) * 0.22, 0.0, Math.sin(angle) * 0.22);
    const flare = createSegmentMesh(0.55, 0.08, 0.72, flareStart, flareDir, trunkMat);
    group.add(flare);
  }

  const trunkTip = currentPos.clone();
  
  // 2. Sprawling branch skeleton splitting into 4 gnarled, tapered branches
  const branchConfigs = [
    { dir: new THREE.Vector3(-1.3, 0.75, 0.7).normalize(), length: 2.1, rB: 0.36, rT: 0.12 },
    { dir: new THREE.Vector3(1.4, 0.85, -0.7).normalize(), length: 2.3, rB: 0.34, rT: 0.10 },
    { dir: new THREE.Vector3(-0.8, 1.1, -1.2).normalize(), length: 2.2, rB: 0.33, rT: 0.10 },
    { dir: new THREE.Vector3(0.9, 0.65, 1.3).normalize(), length: 1.9, rB: 0.32, rT: 0.08 },
  ];
  
  const branchTips: THREE.Vector3[] = [];
  
  branchConfigs.forEach((cfg, idx) => {
    // Generate curved, segmented limbs extending past inner canopy core
    const segCount = 3;
    const segLen = cfg.length / segCount;
    let bPos = trunkTip.clone();
    let bDir = cfg.dir.clone();
    
    for (let s = 0; s < segCount; s++) {
      const t = s / segCount;
      const rB = cfg.rB * (1 - t) + cfg.rT * t;
      const nextT = (s + 1) / segCount;
      const rT = cfg.rB * (1 - nextT) + cfg.rT * nextT;
      
      // Twisting behavior
      if (s > 0) {
        bDir.x += Math.sin(s * 1.6 + idx) * 0.16;
        bDir.z += Math.cos(s * 1.4 + idx) * 0.16;
        bDir.normalize();
      }
      
      const bSeg = createSegmentMesh(rB, rT, segLen, bPos, bDir, trunkMat);
      group.add(bSeg);
      
      bPos.add(bDir.clone().multiplyScalar(segLen));
    }
    
    branchTips.push(bPos.clone());
  });

  // 3. Canopy Clumping & Per-Clump Normal Averaging
  // Group 12 DodecahedronGeometry meshes into 4 distinct asymmetric clump zones
  const foliageGeometries: THREE.BufferGeometry[] = [];
  
  const createClumpInGroup = (tip: THREE.Vector3, baseRadius: number, count: number) => {
    const clumpGeoms: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < count; i++) {
      // Main central sphere is larger, secondary satellite spheres are smaller
      const isMain = i === 0;
      const size = baseRadius * (isMain ? 1.0 : (0.55 + Math.random() * 0.4));
      const geom = new THREE.DodecahedronGeometry(size, 1);
      
      // Position offset deeply intersecting
      let dx = 0;
      let dy = 0;
      let dz = 0;
      if (!isMain) {
        dx = (Math.random() - 0.5) * (baseRadius * 0.9);
        dy = (Math.random() - 0.35) * (baseRadius * 0.7);
        dz = (Math.random() - 0.5) * (baseRadius * 0.9);
      }
      
      geom.translate(tip.x + dx, tip.y + dy, tip.z + dz);
      clumpGeoms.push(geom);
    }
    
    // Average normals relative to this specific clump's local branch tip center!
    clumpGeoms.forEach(geom => {
      averageNormals(geom, tip);
    });
    
    return clumpGeoms;
  };

  // Clump 1 (at tip1): Medium cluster (3 spheres)
  foliageGeometries.push(...createClumpInGroup(branchTips[0], 1.25, 3));
  
  // Clump 2 (at tip2): Medium-large cluster (3 spheres)
  foliageGeometries.push(...createClumpInGroup(branchTips[1], 1.35, 3));
  
  // Clump 3 (at tip3): Massive main canopy cluster (4 spheres, towering and dense)
  foliageGeometries.push(...createClumpInGroup(branchTips[2], 1.85, 4));
  
  // Clump 4 (at tip4): Small leaf tufts lower down (2 spheres)
  foliageGeometries.push(...createClumpInGroup(branchTips[3], 0.85, 2));

  // Determine global bounds of all foliage to calculate vertex-color gradients
  let minY = Infinity;
  let maxY = -Infinity;
  foliageGeometries.forEach((geom) => {
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  // Apply colors, foliage tagging, and create meshes
  foliageGeometries.forEach((geom) => {
    applyFoliageColors(geom, minY, maxY, false); // false for Oak colors
    tagFoliage(geom, 1.0);
    
    const mesh = new THREE.Mesh(geom, leafMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  return group;
};

const generatePine = () => {
  const group = new THREE.Group();
  const trunkMat = createMaterial(0x4a3b32, false);
  const leafMat = createMaterial(0x1b4d3e, true, true); // Use vertex colors!

  // Curved path leaning heavily towards leeward side (positive X and slightly negative Z)
  const P0 = new THREE.Vector3(0, 0, 0);
  const P1 = new THREE.Vector3(0.7, 1.9, 0.3);
  const P2 = new THREE.Vector3(2.5, 4.4, -0.2); // sharp 25-30 degree leeward lean

  // 1. Generate curved Windswept segmented Trunk
  const segmentsCount = 8;
  for (let i = 0; i < segmentsCount; i++) {
    const tStart = i / segmentsCount;
    const tEnd = (i + 1) / segmentsCount;
    
    const startPos = getBezierPoint(P0, P1, P2, tStart);
    const endPos = getBezierPoint(P0, P1, P2, tEnd);
    const dir = getBezierTangent(P0, P1, P2, tStart);
    const height = startPos.distanceTo(endPos);
    
    // Sharp taper from bottom to top
    let rBottom = 0.68 * (1 - tStart) + 0.10 * tStart;
    let rTop = 0.68 * (1 - tEnd) + 0.10 * tEnd;
    
    // Root flare segment
    if (i === 0) {
      rBottom = 1.25;
      rTop = 0.58;
    }
    
    const segment = createSegmentMesh(rBottom, rTop, height, startPos, dir, trunkMat);
    group.add(segment);
  }

  // Supporting root flares clinging to ground
  const rootAngles = [0.8, 2.1, 3.7, 5.3];
  rootAngles.forEach(angle => {
    const rDir = new THREE.Vector3(Math.cos(angle) * 1.5, -0.2, Math.sin(angle) * 1.5).normalize();
    const rStart = new THREE.Vector3(Math.cos(angle) * 0.15, 0.05, Math.sin(angle) * 0.15);
    const root = createSegmentMesh(0.42, 0.05, 0.75, rStart, rDir, trunkMat);
    group.add(root);
  });

  // 2. Asymmetric Foliage Pads (Heavy Leeward Shifting)
  const padSpecs = [
    { t: 0.45, offset: new THREE.Vector3(1.15, 0.1, 0.15), scale: new THREE.Vector3(0.9, 0.3, 0.8) },
    { t: 0.65, offset: new THREE.Vector3(1.45, 0.2, -0.2), scale: new THREE.Vector3(1.05, 0.3, 0.9) },
    { t: 0.8, offset: new THREE.Vector3(1.7, 0.3, 0.25), scale: new THREE.Vector3(1.15, 0.3, 0.95) },
    { t: 0.95, offset: new THREE.Vector3(1.3, 0.3, -0.1), scale: new THREE.Vector3(0.95, 0.3, 0.85) },
    { t: 1.0, offset: new THREE.Vector3(0.7, 0.4, 0.15), scale: new THREE.Vector3(0.75, 0.3, 0.7) },
  ];

  const foliageGeometries: THREE.BufferGeometry[] = [];
  const geomToPadCenterMap = new Map<THREE.BufferGeometry, THREE.Vector3>();

  padSpecs.forEach((spec) => {
    const trunkPt = getBezierPoint(P0, P1, P2, spec.t);
    const pCenter = trunkPt.clone().add(spec.offset);

    // Create branch limb from trunk to foliage pad
    const bDir = pCenter.clone().sub(trunkPt);
    const bLen = bDir.length();
    if (bLen > 0.15) {
      const bSeg = createSegmentMesh(0.2, 0.06, bLen * 0.92, trunkPt, bDir, trunkMat);
      group.add(bSeg);
    }

    // Construct each pine foliage pad from a micro-cluster of 4 flat-scaled overlapping spheres
    const padGeoms = createPineMicroClusterPad(pCenter, spec.scale, 4);
    padGeoms.forEach(g => {
      foliageGeometries.push(g);
      geomToPadCenterMap.set(g, pCenter);
    });
  });

  // Find dynamic vertical bounds of all pine foliage
  let minY = Infinity;
  let maxY = -Infinity;
  foliageGeometries.forEach((geom) => {
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  // Apply outward normal averaging relative to micro-cluster centers & vertex gradients
  foliageGeometries.forEach((geom) => {
    const pCenter = geomToPadCenterMap.get(geom) || new THREE.Vector3(0, 3, 0);
    averageNormals(geom, pCenter);
    applyFoliageColors(geom, minY, maxY, true); // true for pine color gradient
    tagFoliage(geom, 1.0);

    const mesh = new THREE.Mesh(geom, leafMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  return group;
};

const generateSpire = () => {
  const group = new THREE.Group();
  const stoneMat = createMaterial(0x2e3440, false);
  const roofMat = createMaterial(0x4c566a, false);

  const baseGeom = new THREE.CylinderGeometry(1, 1.5, 4, 8);
  tagFoliage(baseGeom, 0.0);
  baseGeom.translate(0, 2, 0);
  const base = new THREE.Mesh(baseGeom, stoneMat);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roofGeom = new THREE.ConeGeometry(1.4, 2, 8);
  tagFoliage(roofGeom, 0.0);
  roofGeom.translate(0, 5, 0);
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  return group;
};

const assets = [
  { id: 'lineup', name: 'Ghibli Studio Line-up', generate: () => null },
  { id: 'oak', name: 'Ghibli Oak', generate: () => null },
  { id: 'birch', name: 'Ghibli Birch', generate: () => null },
  { id: 'pine', name: 'Windswept Pine', generate: () => null },
  { id: 'bush', name: 'Ghibli Bush', generate: () => null },
  { id: 'custom', name: 'Custom Sandbox', generate: () => null },
  { id: 'spire', name: 'Wizard Spire', generate: generateSpire },
];

export default function App() {
  const canvasContainer = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState('lineup'); // Default to the requested line-up
  const [autoRotate, setAutoRotate] = useState(false);
  
  const [params, setParams] = useState<TreeParams>({
    seed: 1337,
    height: 7.0,
    radius: 0.4,
    gnarliness: 0.4,
    rootFlare: 2.0,
    branchSplits: 3,
    branchLength: 2.5,
    branchAngle: 35,
    puffballCount: 12,
    puffballSize: 1.8,
    foliageFlattening: 1.0,
    twistIntensity: 1.0,
    jointFlaring: 1.5,
    leafJitter: 0.1,
    skyHolesDensity: 0.3,
    highlightSaturation: 1.0,
    shadowDepth: 0.5,
    enableWind: false,
    polygonWeight: 0.5,
    lodMultiplier: 1.5,
  });

  const handleParamChange = (key: keyof TreeParams, value: number | boolean | string) => {
    setParams(prev => ({ ...prev, [key]: value }));
    if (activeId !== 'custom' && activeId !== 'lineup') {
      // Don't auto-switch if they are just adjusting sliders on the currently selected preset!
      // setActiveId('custom');
    }
  };

  const randomizeSeed = () => {
    let profile = 'oak';
    if (activeId === 'birch') profile = 'birch';
    else if (activeId === 'pine') profile = 'pine';
    else if (activeId === 'bush') profile = 'bush';
    else if (activeId === 'custom' || activeId === 'lineup') {
      const profiles = ['oak', 'birch', 'pine', 'bush'];
      profile = profiles[Math.floor(Math.random() * profiles.length)];
    }

    let newHeight = 0;
    let newRadius = 0;
    let newBranchLength = 0;
    let newBranchAngle = 0;
    let newPuffballSize = 0;
    let newFoliageFlattening = 0;
    let newGnarliness = 0;
    let newBranchSplits = 0;

    if (profile === 'oak') {
      newHeight = 7.0 + Math.random() * 4.0;
      newRadius = newHeight * (0.08 + Math.random() * 0.04);
      newBranchLength = newHeight * (0.3 + Math.random() * 0.15);
      newBranchAngle = 35 + Math.random() * 20;
      newPuffballSize = newBranchLength * (0.6 + Math.random() * 0.3);
      newFoliageFlattening = 0.8 + Math.random() * 0.2;
      newGnarliness = 0.2 + Math.random() * 0.3;
      newBranchSplits = 3;
    } else if (profile === 'birch') {
      newHeight = 12.0 + Math.random() * 6.0;
      newRadius = newHeight * (0.02 + Math.random() * 0.02);
      newBranchLength = newHeight * (0.05 + Math.random() * 0.05);
      newBranchAngle = 10 + Math.random() * 15;
      newPuffballSize = newBranchLength * (0.4 + Math.random() * 0.4);
      newFoliageFlattening = 0.9 + Math.random() * 0.3;
      newGnarliness = 0.05 + Math.random() * 0.15;
      newBranchSplits = 2;
    } else if (profile === 'pine') {
      newHeight = 9.0 + Math.random() * 5.0;
      newRadius = newHeight * (0.04 + Math.random() * 0.02);
      newBranchLength = newHeight * (0.15 + Math.random() * 0.1);
      newBranchAngle = 35 + Math.random() * 15;
      newPuffballSize = newBranchLength * (0.6 + Math.random() * 0.3);
      newFoliageFlattening = 0.4 + Math.random() * 0.2;
      newGnarliness = 0.1 + Math.random() * 0.2;
      newBranchSplits = 3;
    } else { // bush
      newHeight = 2.0 + Math.random() * 2.0;
      newRadius = newHeight * (0.1 + Math.random() * 0.05);
      newBranchLength = newHeight * (0.35 + Math.random() * 0.1);
      newBranchAngle = 40 + Math.random() * 15;
      newPuffballSize = newBranchLength * (0.8 + Math.random() * 0.4);
      newFoliageFlattening = 0.4 + Math.random() * 0.3;
      newGnarliness = 0.8 + Math.random() * 0.7;
      newBranchSplits = 3;
    }

    setParams(prev => ({
      ...prev,
      seed: Math.floor(Math.random() * 1000000),
      species: profile,
      height: newHeight,
      radius: newRadius,
      gnarliness: newGnarliness,
      rootFlare: 1.2 + Math.random() * 1.5,
      branchSplits: newBranchSplits,
      branchLength: newBranchLength,
      branchAngle: newBranchAngle,
      puffballCount: 5 + Math.floor(Math.random() * 8),
      puffballSize: newPuffballSize,
      foliageFlattening: newFoliageFlattening,
      twistIntensity: Math.random() * 2.5,
      jointFlaring: 1.2 + Math.random() * 1.0,
      leafJitter: 0.05 + Math.random() * 0.15,
      skyHolesDensity: 0.2 + Math.random() * 0.4,
      highlightSaturation: 0.7 + Math.random() * 0.8,
      shadowDepth: 0.3 + Math.random() * 0.6,
      polygonWeight: 0.3 + Math.random() * 0.7
    }));
    setActiveId('custom');
  };

  useEffect(() => {
    if (!canvasContainer.current) return;
    const scene = new THREE.Scene();
    
    const isLineup = activeId === 'lineup';
    scene.background = new THREE.Color(isLineup ? 0x2a2a2a : 0xf0f0f0); // Dark grey studio background for lineup

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    
    if (isLineup) {
      camera.position.set(0, 5, 25); // Directly forward-facing, wide view
    } else {
      camera.position.set(8, 6, 8);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    canvasContainer.current.innerHTML = '';
    canvasContainer.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    if (isLineup) {
      controls.target.set(0, 4, 0);
    } else {
      controls.target.set(0, 2, 0);
    }

    const ambient = new THREE.AmbientLight(0xffffff, isLineup ? 0.7 : 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLineup ? 1.2 : 1.0);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    if (!isLineup) {
      const grid = new THREE.GridHelper(20, 20, 0x000000, 0xcccccc);
      scene.add(grid);
    }

    // Dynamic generation loop
    const assetSpec = assets.find(a => a.id === activeId);
    let currentAsset: THREE.Object3D | undefined;
    
    if (isLineup) {
      currentAsset = new THREE.Group();
      
      // Birch (Center)
      const birchParams = { ...params, seed: 101, species: 'birch', height: 16, radius: 0.25, branchLength: 1.2, branchAngle: 15, branchSplits: 2, puffballCount: 18, puffballSize: 1.0, leafJitter: 0.15, polygonWeight: 0.6 };
      const birch = generateCustomTree(birchParams, createMaterial);
      birch.position.set(0, 0, 0);
      currentAsset.add(birch);
      
      // Pine (Left)
      const pineParams = { ...params, seed: 202, species: 'pine', height: 13, radius: 0.5, branchLength: 2.8, polygonWeight: 0.6 };
      const pine = generateCustomTree(pineParams, createMaterial);
      pine.position.set(-8, 0, 0);
      currentAsset.add(pine);
      
      // Oak (Right)
      const oakParams = { ...params, seed: 303, species: 'default', height: 8.5, radius: 0.6, branchLength: 3.5, puffballCount: 14, puffballSize: 2.2, polygonWeight: 0.5 };
      const oak = generateCustomTree(oakParams, createMaterial);
      oak.position.set(8, 0, 2);
      currentAsset.add(oak);
      
      // Bush (Far Right)
      const bushParams = { ...params, seed: 404, species: 'bush', branchLength: 0.6, puffballCount: 6, puffballSize: 0.5, polygonWeight: 0.5 };
      const bush = generateCustomTree(bushParams, createMaterial);
      bush.position.set(13, 0, 4);
      currentAsset.add(bush);
      
    } else if (assetSpec) {
      if (assetSpec.id === 'custom') {
        currentAsset = generateCustomTree(params, createMaterial);
      } else if (assetSpec.id === 'oak') {
        currentAsset = generateCustomTree({ ...params, species: 'default' }, createMaterial);
      } else if (assetSpec.id === 'birch') {
        currentAsset = generateCustomTree({ ...params, species: 'birch' }, createMaterial);
      } else if (assetSpec.id === 'pine') {
        currentAsset = generateCustomTree({ ...params, species: 'pine' }, createMaterial);
      } else if (assetSpec.id === 'bush') {
        currentAsset = generateCustomTree({ ...params, species: 'bush' }, createMaterial);
      } else {
        currentAsset = assetSpec.generate();
      }
    }
    
    if (currentAsset) scene.add(currentAsset);

    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      
      if (currentAsset) {
        if (currentAsset instanceof THREE.LOD) {
          currentAsset.update(camera);
        }
        currentAsset.traverse(child => {
          if (child instanceof THREE.Mesh && child.material.onBeforeCompile) {
            const mat = child.material;
            if (mat.userData && mat.userData.shader) {
               mat.userData.shader.uniforms.uTime.value = params.enableWind ? elapsed : 0;
            }
          }
        });
      }

      if (autoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
      } else {
        controls.autoRotate = false;
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!canvasContainer.current) return;
      const width = canvasContainer.current.clientWidth;
      const height = canvasContainer.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    // Force initial correct layout mapping
    handleResize();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      
      if (currentAsset) {
        currentAsset.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, [activeId, autoRotate, params]);

  return (
    <div id="app-root">
      <div id="canvas-container" ref={canvasContainer} />
      
      <div id="editor-panel">
        <div style={{ marginBottom: '15px' }}>
          <h1 style={{ fontSize: '14px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#00ffcc' }}>Procedural Assets</h1>
          <p style={{ fontSize: '10px', margin: 0, color: '#888', textTransform: 'uppercase' }}>WebGL Generative Engine</p>
        </div>

        <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: '12px', marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#aaa', letterSpacing: '1px' }}>ASSET SELECTION</label>
          <select 
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {activeId === 'custom' && (
          <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#aaa', letterSpacing: '1px' }}>CUSTOM SPECIES</label>
            <select 
              value={params.species || 'default'}
              onChange={(e) => handleParamChange('species', e.target.value)}
            >
              <option value="default">Default</option>
              <option value="pine">Pine</option>
              <option value="birch">Birch</option>
              <option value="bush">Bush</option>
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', color: '#ddd', marginBottom: '8px' }}>
            <input 
              type="checkbox" 
              checked={autoRotate} 
              onChange={(e) => setAutoRotate(e.target.checked)} 
              style={{ width: 'auto', marginBottom: 0, cursor: 'pointer' }} 
            />
            AUTO-ROTATE SCENE
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', color: '#ddd' }}>
            <input 
              type="checkbox" 
              checked={params.enableWind} 
              onChange={(e) => handleParamChange('enableWind', e.target.checked)} 
              style={{ width: 'auto', marginBottom: 0, cursor: 'pointer' }} 
            />
            ENABLE WIND SWAY
          </label>
        </div>

        {/* Global / Seed Settings */}
        <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: '12px', marginBottom: '12px', marginTop: '12px' }}>
          <label>PROCEDURAL SEED</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input 
              type="number" 
              value={params.seed} 
              onChange={(e) => handleParamChange('seed', parseInt(e.target.value) || 0)} 
              style={{ flex: 1, margin: 0 }}
            />
            <button onClick={randomizeSeed} style={{ flex: '0 0 auto', width: 'auto', margin: 0, padding: '0 10px' }}>RANDOMIZE</button>
          </div>

          <div>
            <div className="slider-row">
              <label>POLYGON WEIGHT (DENSITY)</label>
              <span>{params.polygonWeight.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.1" 
              value={params.polygonWeight} 
              onChange={(e) => handleParamChange('polygonWeight', parseFloat(e.target.value))} 
            />
          </div>
        </div>

        {/* Section A: Trunk & Structure */}
        <details open>
          <summary>SECTION A: TRUNK & STRUCTURE</summary>
          <div className="control-group">
            <div>
              <div className="slider-row">
                <label>HEIGHT</label>
                <span>{params.height.toFixed(1)}m</span>
              </div>
              <input 
                type="range" 
                min="2.0" 
                max="15.0" 
                step="0.5" 
                value={params.height} 
                onChange={(e) => handleParamChange('height', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>TRUNK RADIUS</label>
                <span>{params.radius.toFixed(2)}m</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.5" 
                step="0.05" 
                value={params.radius} 
                onChange={(e) => handleParamChange('radius', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>GNARLINESS (BENDING)</label>
                <span>{params.gnarliness.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.5" 
                step="0.05" 
                value={params.gnarliness} 
                onChange={(e) => handleParamChange('gnarliness', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>ROOT FLARE</label>
                <span>x{params.rootFlare.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="4.0" 
                step="0.1" 
                value={params.rootFlare} 
                onChange={(e) => handleParamChange('rootFlare', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>TWIST INTENSITY</label>
                <span>{params.twistIntensity.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="3.0" 
                step="0.1" 
                value={params.twistIntensity} 
                onChange={(e) => handleParamChange('twistIntensity', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>JOINT FLARING</label>
                <span>{params.jointFlaring.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="3.0" 
                step="0.1" 
                value={params.jointFlaring} 
                onChange={(e) => handleParamChange('jointFlaring', parseFloat(e.target.value))} 
              />
            </div>
          </div>
        </details>

        {/* Section B: Branches */}
        <details open>
          <summary>SECTION B: BRANCHES</summary>
          <div className="control-group">
            <div>
              <div className="slider-row">
                <label>BRANCH SPLITS</label>
                <span>{params.branchSplits}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="1" 
                value={params.branchSplits} 
                onChange={(e) => handleParamChange('branchSplits', parseInt(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>BRANCH LENGTH</label>
                <span>{params.branchLength.toFixed(1)}m</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.1" 
                value={params.branchLength} 
                onChange={(e) => handleParamChange('branchLength', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>BRANCH ANGLE</label>
                <span>{params.branchAngle}°</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="75" 
                step="5" 
                value={params.branchAngle} 
                onChange={(e) => handleParamChange('branchAngle', parseInt(e.target.value))} 
              />
            </div>
          </div>
        </details>

        {/* Section C: Foliage */}
        <details open>
          <summary>SECTION C: FOLIAGE (PUFFBALLS)</summary>
          <div className="control-group">
            <div>
              <div className="slider-row">
                <label>PUFFBALL COUNT</label>
                <span>{params.puffballCount}</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="25" 
                step="1" 
                value={params.puffballCount} 
                onChange={(e) => handleParamChange('puffballCount', parseInt(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>PUFFBALL SIZE</label>
                <span>{params.puffballSize.toFixed(1)}m</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="4.0" 
                step="0.1" 
                value={params.puffballSize} 
                onChange={(e) => handleParamChange('puffballSize', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>FOLIAGE FLATTENING</label>
                <span>{params.foliageFlattening.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.2" 
                max="1.5" 
                step="0.1" 
                value={params.foliageFlattening} 
                onChange={(e) => handleParamChange('foliageFlattening', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>LEAF JITTER</label>
                <span>{params.leafJitter.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="0.5" 
                step="0.02" 
                value={params.leafJitter} 
                onChange={(e) => handleParamChange('leafJitter', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>SKY HOLES DENSITY</label>
                <span>{params.skyHolesDensity.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="0.9" 
                step="0.05" 
                value={params.skyHolesDensity} 
                onChange={(e) => handleParamChange('skyHolesDensity', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>LOD OPTIMIZATION MULTIPLIER</label>
                <span>x{params.lodMultiplier.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.5" 
                value={params.lodMultiplier} 
                onChange={(e) => handleParamChange('lodMultiplier', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={params.enableWind} 
                  onChange={(e) => handleParamChange('enableWind', e.target.checked)} 
                />
                ENABLE WIND SWAY
              </label>
            </div>
          </div>
        </details>

        {/* Section D: Lighting & Color */}
        <details open>
          <summary>SECTION D: LIGHTING & COLOR</summary>
          <div className="control-group">
            <div>
              <div className="slider-row">
                <label>HIGHLIGHT SATURATION</label>
                <span>x{params.highlightSaturation.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1" 
                value={params.highlightSaturation} 
                onChange={(e) => handleParamChange('highlightSaturation', parseFloat(e.target.value))} 
              />
            </div>

            <div>
              <div className="slider-row">
                <label>SHADOW DEPTH</label>
                <span>{params.shadowDepth.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.05" 
                value={params.shadowDepth} 
                onChange={(e) => handleParamChange('shadowDepth', parseFloat(e.target.value))} 
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
