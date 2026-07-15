import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TreeParams } from './types';

export function createPRNG(seed: number) {
  let h = 1540483477 ^ seed;
  return function() {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// Geometric helpers inside procedural-assets.ts
const tagFoliageLocal = (geometry: THREE.BufferGeometry, isFoliage: number) => {
  const count = geometry.attributes.position.count;
  const arr = new Float32Array(count);
  arr.fill(isFoliage);
  geometry.setAttribute('isFoliage', new THREE.BufferAttribute(arr, 1));
};

const averageNormalsLocal = (geometry: THREE.BufferGeometry, center: THREE.Vector3) => {
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

const applyLeafJitter = (geometry: THREE.BufferGeometry, jitterAmount: number, rand: () => number) => {
  if (jitterAmount <= 0) return;
  const pos = geometry.attributes.position;
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    
    // Low-frequency Simplex-like noise displacement
    const noiseX = (Math.sin(x*4.0 + y*2.0) + Math.cos(z*4.0)) * 0.5;
    const noiseY = (Math.sin(y*4.0 + z*2.0) + Math.cos(x*4.0)) * 0.5;
    const noiseZ = (Math.sin(z*4.0 + x*2.0) + Math.cos(y*4.0)) * 0.5;
    
    pos.setXYZ(i, x + noiseX * jitterAmount, y + noiseY * jitterAmount, z + noiseZ * jitterAmount);
  }
  pos.needsUpdate = true;
};

const createContinuousBranch = (
  points: { pos: THREE.Vector3, radius: number, twistIntensity: number, baseTwist: number, gnarliness: number, flareIntensity: number }[],
  radialSegments: number,
  treeHeight: number
) => {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = points.length - 1;
  if (segments < 1) return geom;
  
  const frames: { normal: THREE.Vector3, binormal: THREE.Vector3, tangent: THREE.Vector3 }[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const tangent = new THREE.Vector3();
    if (i === 0) {
      tangent.subVectors(points[1].pos, points[0].pos).normalize();
      if (points[0].pos.y < 0.01) {
        tangent.set(0, 1, 0); // Keep root explicitly vertical to avoid leaning bottom edge
      }
    } else if (i === segments) {
      tangent.subVectors(points[i].pos, points[i-1].pos).normalize();
    } else {
      tangent.subVectors(points[i+1].pos, points[i-1].pos).normalize();
    }
    
    let normal = new THREE.Vector3();
    let binormal = new THREE.Vector3();
    
    if (i === 0) {
      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > 0.99) up.set(1, 0, 0);
      binormal.crossVectors(tangent, up).normalize();
      normal.crossVectors(binormal, tangent).normalize();
    } else {
      const prevNormal = frames[i-1].normal;
      const prevTangent = frames[i-1].tangent;
      const axis = new THREE.Vector3().crossVectors(prevTangent, tangent);
      const angle = prevTangent.angleTo(tangent);
      
      if (axis.lengthSq() > 1e-6) {
        axis.normalize();
        normal.copy(prevNormal).applyAxisAngle(axis, angle);
      } else {
        normal.copy(prevNormal);
      }
      binormal.crossVectors(tangent, normal).normalize();
    }
    frames.push({ tangent, normal, binormal });
  }
  
  for (let i = 0; i <= segments; i++) {
    const pt = points[i];
    const frame = frames[i];
    const normalizedHeight = Math.max(0, pt.pos.y) / 10.0; // approximate overall tree height reference
    
    // Joint Flaring as a continuous cosine wave mapped globally
    const waveFreq = 8.0;
    const wave = Math.cos(normalizedHeight * Math.PI * waveFreq);
    // Base radius + continuous flaring wave
    const finalRadius = pt.radius * (1.0 + wave * 0.15 * pt.flareIntensity);

    for (let j = 0; j <= radialSegments; j++) {
      // Twist intensity scaled by absolute height
      const twistModifier = pt.twistIntensity * normalizedHeight * Math.PI * 2.0;
      const angle = (j / radialSegments) * Math.PI * 2 + pt.baseTwist + twistModifier;
      
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const v = new THREE.Vector3();
      v.copy(pt.pos);
      v.addScaledVector(frame.normal, finalRadius * cos);
      v.addScaledVector(frame.binormal, finalRadius * sin);
      
      // Gnarliness noise based on absolute height
      const gnarlX = (Math.sin(normalizedHeight * 12.0) + Math.cos(normalizedHeight * 18.0)) * 0.5;
      const gnarlZ = (Math.cos(normalizedHeight * 14.0) + Math.sin(normalizedHeight * 20.0)) * 0.5;
      
      // 3. Gnarliness & Bending Dampening
      // Dampen gnarliness at the top of the tree (normalizedHeight near 1) and branch tips (i / segments near 1)
      const heightDampen = Math.max(0.0, 1.0 - Math.pow(normalizedHeight, 2.0));
      const tipDampen = 1.0 - Math.pow(i / segments, 2.0);
      const totalDampen = heightDampen * tipDampen;
      
      v.x += gnarlX * pt.gnarliness * 0.4 * totalDampen;
      v.z += gnarlZ * pt.gnarliness * 0.4 * totalDampen;
      
      // 1. Strict Spatial Bounding Box (XYZ Cut-offs)
      // Clamp absolute horizontal sprawl to max radius 60% of tree height
      const maxSprawl = treeHeight * 0.6;
      const horizontalDist = Math.sqrt(v.x * v.x + v.z * v.z);
      if (horizontalDist > maxSprawl && maxSprawl > 0) {
        const scale = maxSprawl / horizontalDist;
        v.x *= scale;
        v.z *= scale;
      }
      
      // Soft bottom clip to prevent clipping through the floor and create a natural ground anchor
      if (v.y < 0) {
        // Ground anchor effect: convert underground depth into outward root spread
        const depth = -v.y;
        v.y = 0; // Lock perfectly to the ground plane
        
        // Push outward based on how deep it was trying to go
        const hDir = new THREE.Vector3(v.x, 0, v.z).normalize();
        v.addScaledVector(hDir, depth * 0.8);
      }
      
      vertices.push(v.x, v.y, v.z);
    }
  }
  
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const v0 = i * (radialSegments + 1) + j;
      const v1 = i * (radialSegments + 1) + j + 1;
      const v2 = (i + 1) * (radialSegments + 1) + j;
      const v3 = (i + 1) * (radialSegments + 1) + j + 1;
      
      // Standard CCW winding for exterior normals
      indices.push(v0, v1, v3);
      indices.push(v0, v3, v2);
    }
  }
  
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  tagFoliageLocal(geom, 0.0);
  return geom;
};

const getCustomGradientColor = (y: number, minY: number, maxY: number, highlightSat: number, shadowDepth: number) => {
  const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
  
  // Custom Toon Palette with smooth step-ramp
  const shadowL = Math.max(0.05, 0.2 - shadowDepth * 0.15);
  const shadowHSL = { h: 0.55, s: 0.4, l: shadowL }; // Deep indigo-teal
  const midHSL = { h: 0.33, s: 0.65, l: 0.45 }; // Vibrant mossy grass-green
  const highHSL = { h: 0.22, s: Math.min(1.0, 0.4 * highlightSat), l: 0.75 }; // Warm cream chartreuse
  
  const c1 = new THREE.Color().setHSL(shadowHSL.h, shadowHSL.s, shadowHSL.l);
  const c2 = new THREE.Color().setHSL(midHSL.h, midHSL.s, midHSL.l);
  const c3 = new THREE.Color().setHSL(highHSL.h, highHSL.s, highHSL.l);
  
  // Procedural AO baked into vertex colors: darken bottom slightly more
  const finalColor = new THREE.Color();
  const smoothT = t * t * (3 - 2 * t);
  if (smoothT < 0.4) {
    const factor = smoothT / 0.4;
    finalColor.lerpColors(c1, c2, factor);
  } else {
    const factor = (smoothT - 0.4) / 0.6;
    finalColor.lerpColors(c2, c3, factor);
  }
  return finalColor;
};

const applyFoliageColorsLocal = (geometry: THREE.BufferGeometry, minY: number, maxY: number, highlightSat: number, shadowDepth: number) => {
  const pos = geometry.attributes.position;
  if (!pos) return;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    // Bake AO: lower y values get darker
    const aoFactor = Math.min(1.0, Math.max(0.0, (y - minY) / ((maxY - minY) || 1)));
    const baseColor = getCustomGradientColor(y, minY, maxY, highlightSat, shadowDepth);
    
    // Apply slight AO darkening based on vertical position within the whole canopy
    baseColor.multiplyScalar(0.7 + 0.3 * aoFactor);

    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

function createTreeTier(
  rawParams: TreeParams,
  createMaterial: (colorHex: number, isFoliage: boolean, useVertexColors?: boolean) => THREE.Material,
  lodLevel: number
): THREE.Group {
  // Proportional Radius-to-Height Caps
  const maxRadius = rawParams.height * 0.12;
  const safeRadius = Math.min(rawParams.radius, maxRadius);
  
  // Ensure the flared base at Y = 0 never exceeds a maximum radius of 3.0 units.
  const maxBaseRadius = 3.0;
  let safeRootFlare = rawParams.rootFlare;
  if (safeRadius * safeRootFlare > maxBaseRadius) {
    safeRootFlare = maxBaseRadius / safeRadius;
  }

  const params: TreeParams = {
    ...rawParams,
    radius: safeRadius,
    rootFlare: safeRootFlare
  };

  const group = new THREE.Group();
  
  const rand = createPRNG(params.seed);
  
  // Trunk and Branch materials
  const trunkMat = createMaterial(0x5c4033, false);
  const leafMat = createMaterial(0x2e8b57, true, true); // foliage uses vertex colors!
  
  // 1. Primary Trunk (The Wood Structure)
  // More vertical segments to allow for smooth root flaring and bending
  let trunkSegments = Math.max(12, Math.floor(12 + params.polygonWeight * 16));
  if (lodLevel === 1) trunkSegments = 6;
  const trunkHeight = params.height * 0.4; // Trunk splits at 40% height
  const segHeight = trunkHeight / trunkSegments;
  // 5 segments at Weight 0.0 up to 16 segments at Weight 1.0
  let radialSegments = Math.max(5, Math.floor(5 + params.polygonWeight * 11));
  if (lodLevel === 1) {
    radialSegments = Math.min(radialSegments, 5);
  }
  
  if (lodLevel === 2) {
    const rBottom = params.radius * params.rootFlare;
    const rTop = params.radius * 0.3;
    const trunkHeight = params.height * 0.6;
    
    const pts = [
      { pos: new THREE.Vector3(0, 0, 0), radius: rBottom, twistIntensity: 0, baseTwist: 0, gnarliness: 0, flareIntensity: 0 },
      { pos: new THREE.Vector3(0, trunkHeight, 0), radius: rTop, twistIntensity: 0, baseTwist: 0, gnarliness: 0, flareIntensity: 0 }
    ];
    const segGeom = createContinuousBranch(pts, 4, params.height);
    segGeom.computeVertexNormals();
    const seg = new THREE.Mesh(segGeom, trunkMat);
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
    
    const canopySize = params.branchLength * 1.5;
    const geom = new THREE.IcosahedronGeometry(canopySize, 0);
    geom.scale(1.0, params.foliageFlattening, 1.0);
    geom.translate(0, trunkHeight + canopySize * 0.3, 0);
    
    const colors = new Float32Array(geom.attributes.position.count * 3);
    for (let i = 0; i < geom.attributes.position.count; i++) {
       const y = geom.attributes.position.getY(i);
       const baseColor = getCustomGradientColor(y, trunkHeight, trunkHeight + canopySize, params.highlightSaturation, params.shadowDepth);
       colors[i * 3] = baseColor.r;
       colors[i * 3 + 1] = baseColor.g;
       colors[i * 3 + 2] = baseColor.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    tagFoliageLocal(geom, 1.0);
    
    const mesh = new THREE.Mesh(geom, leafMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    
    // Ensure the tree sits perfectly flush at Y = 0
    const box = new THREE.Box3().setFromObject(group);
    if (box.min.y !== 0 && box.min.y !== Infinity) {
      group.position.y = -box.min.y;
    }
    return group;
  }
  
  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDir = new THREE.Vector3(0, 1, 0);
  let currentTwist = 0;
  
  const trunkGeometries: THREE.BufferGeometry[] = [];
  
  const trunkPoints = [];
  for (let i = 0; i <= trunkSegments; i++) {
    const tStart = i / trunkSegments;
    
    // Smooth taper + natural root flare exponential curve
    let taper = 1.0 - tStart * 0.3;
    // Stretch the flare across the bottom 40% of the trunk, dropping smoothly
    let rootFlareFactor = Math.pow(Math.max(0, 1 - tStart * 2.5), 2.0);
    let flareMultiplier = 1.0 + (rootFlareFactor * (params.rootFlare - 1.0));
    
    let radius = params.radius * taper * flareMultiplier;

    // Root firmly at 0,0 - dampen bending at the very base with a soft quadratic curve
    let baseBending = Math.pow(Math.max(0, Math.min(1.0, (tStart - 0.05) * 4.0)), 2.0); 
    let bendX = Math.sin(tStart * Math.PI * params.gnarliness * 2.0) * params.gnarliness * baseBending * 0.5;
    let bendZ = Math.cos(tStart * Math.PI * params.gnarliness * 2.5) * params.gnarliness * baseBending * 0.5;
    
    currentPos.set(bendX, tStart * trunkHeight, bendZ);

    trunkPoints.push({ 
      pos: currentPos.clone(), 
      radius, 
      twistIntensity: params.twistIntensity * Math.min(1.0, tStart * 3.0), // Dampen twist at the very root
      baseTwist: 0,
      gnarliness: params.gnarliness * baseBending, // Dampen surface noise at the root
      flareIntensity: params.jointFlaring * Math.min(1.0, tStart * 3.0) // No joint flaring at the very bottom
    });
  }
  
  trunkGeometries.push(createContinuousBranch(trunkPoints, radialSegments, params.height));
  
  const trunkTip = trunkPoints[trunkPoints.length - 1].pos.clone();
  
  // 2. Recursive "V-Split" Skeleton (Branches)
  const terminalNodes: THREE.Vector3[] = [];
  
  function buildBranch(startPos: THREE.Vector3, startDir: THREE.Vector3, length: number, radiusBase: number, twist: number, depth: number) {
    if (depth === 0 || (lodLevel === 1 && depth === 1)) {
      terminalNodes.push(startPos.clone());
      return;
    }
    
    // Depth 2 = Primary splits from trunk. Depth 1 = Secondary splits.
    const numSplits = depth === 2 ? params.branchSplits : 2;
    // Bound the angle based on depth
    let branchAngle = params.branchAngle * (depth === 2 ? 1.0 : 1.2);
    // Clamp angle between 20 and 55 degrees
    branchAngle = Math.max(20, Math.min(55, branchAngle));
    const angleRad = (branchAngle * Math.PI) / 180;
    
    // Random rotation offset around the parent direction for the cluster of children
    const clusterOffset = rand() * Math.PI * 2;
    
    for (let b = 0; b < numSplits; b++) {
      // Distribute radially around startDir
      const angleAround = clusterOffset + (b / numSplits) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      
      const up = new THREE.Vector3(0, 1, 0);
      let perp = new THREE.Vector3().crossVectors(startDir, up);
      if (perp.lengthSq() < 0.001) {
        perp = new THREE.Vector3(1, 0, 0);
      }
      perp.normalize();
      
      const quaternion = new THREE.Quaternion().setFromAxisAngle(startDir, angleAround);
      const axis = perp.clone().applyQuaternion(quaternion);
      
      let bDir = startDir.clone().applyAxisAngle(axis, angleRad).normalize();
      
      // Upward Gravity Enforcement (No Downward Branches)
      // Enforce the vector to point at least 20 degrees upwards (cos 70) and at most 80 degrees upwards (cos 10)
      const minUpY = Math.cos((70 * Math.PI) / 180); 
      if (bDir.y < minUpY) {
        bDir.y = minUpY;
        bDir.normalize();
      }
      
      // Curve/gnarl branches
      const bSegCount = depth === 2 ? 4 : 3;
      const bTotalLen = length * (0.8 + rand() * 0.4);
      const bSegHeight = bTotalLen / bSegCount;
      
      let bPos = startPos.clone();
      let bCurrentDir = bDir.clone();
      let bTwist = twist;
      
      // If it's a terminal branch (depth === 1), extend it slightly so it buries deep into the foliage pad.
      const actualSegHeight = depth === 1 ? bSegHeight * 1.2 : bSegHeight;
      
      const bPoints = [];
      for (let s = 0; s <= bSegCount; s++) {
        const t = s / bSegCount;
        
        let radius = radiusBase * (1.0 - t * 0.4);
        
        // Natural Terminal Tapering: taper to a fine, organic point on the final branch level
        if (depth === 1) {
          radius = radiusBase * (1.0 - t) + 0.02 * t;
        }
        
        // Gnarliness and Twist are handled by the continuous math evaluator in createContinuousBranch
        
        bPoints.push({ 
          pos: bPos.clone(), 
          radius, 
          twistIntensity: params.twistIntensity,
          baseTwist: bTwist,
          gnarliness: params.gnarliness,
          flareIntensity: params.jointFlaring
        });
        
        bPos.add(bCurrentDir.clone().multiplyScalar(actualSegHeight));
      }
      
      trunkGeometries.push(createContinuousBranch(bPoints, radialSegments, params.height));
      
      // Recursion
      buildBranch(bPoints[bPoints.length - 1].pos, bCurrentDir, length * 0.75, radiusBase * 0.65, bTwist, depth - 1);
    }
  }

  buildBranch(trunkTip, currentDir, params.branchLength, params.radius * 0.65, currentTwist, 2);
  
  // Merge trunk geometries
  if (trunkGeometries.length > 0) {
    let mergedTrunkGeom = BufferGeometryUtils.mergeGeometries(trunkGeometries, false);
    if (mergedTrunkGeom) {
      mergedTrunkGeom = BufferGeometryUtils.mergeVertices(mergedTrunkGeom, 0.01);
      mergedTrunkGeom.computeVertexNormals();
      const trunkMesh = new THREE.Mesh(mergedTrunkGeom, trunkMat);
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      group.add(trunkMesh);
    }
  }

  // 3. Foliage Clumping with Sky Holes & Jitter at Terminal Nodes
  const foliageGeometries: THREE.BufferGeometry[] = [];
  
  // We distribute puffballs ONLY at terminal ends of secondary branches. 
  // Strict 1:1 mapping: every branch tip gets a cluster.
  const validTips = terminalNodes;
  
  if (validTips.length > 0) {
    validTips.forEach(tip => {
      // For LOD 1, we use just 3-4 larger low-poly spheres per tip
      const puffballCount = lodLevel === 1 ? Math.min(params.puffballCount, 3 + Math.floor(rand() * 2)) : params.puffballCount;
      
      // Generate a tightly packed cluster of puffballs precisely at this tip
      for (let i = 0; i < puffballCount; i++) {
        // Controlled, tightly bound offset using Fibonacci
        const phi = i * 1.6180339887 * Math.PI * 2;
        // Progressively further from the center to create a broader canopy, instead of stacking
        const rOffset = Math.pow(i / puffballCount, 0.6) * (params.puffballSize * 1.6);
        
        const isMain = i === 0; // First puffball is the core
        const size = params.puffballSize * (isMain ? 1.0 : (0.6 + rand() * 0.4)) * (lodLevel === 1 ? 1.3 : 1.0); // Larger for LOD1
        
        let geom;
        if (lodLevel === 1) {
          geom = new THREE.IcosahedronGeometry(size, 0);
        } else {
          // scale from 0 to 2
          const detail = Math.max(0, Math.min(2, Math.round(params.polygonWeight * 2)));
          // Icosahedron produces much better organic clumps when squashed than Dodecahedron
          geom = new THREE.IcosahedronGeometry(size, detail);
        }
        
        // Apply flattening (squash on Y-axis)
        geom.scale(1.0, params.foliageFlattening, 1.0);
        
        // Apply Edge Jitter (The Sketchbook Look)
        if (lodLevel === 0) {
          applyLeafJitter(geom, params.leafJitter * size, rand);
        }
        
        // Absolute explicit snapping: translation relies EXACTLY on the tip, with very slight local drift
        let dx = Math.cos(phi) * rOffset;
        let dy = (rand() - 0.2) * (params.puffballSize * 0.2) * params.foliageFlattening; // Strongly biased against dropping
        let dz = Math.sin(phi) * rOffset;
        
        // 1. Strict Spatial Bounding Box (XYZ Cut-offs)
        let finalX = tip.x + dx;
        let finalZ = tip.z + dz;
        const maxSprawl = params.height * 0.6;
        const dist = Math.sqrt(finalX * finalX + finalZ * finalZ);
        if (dist > maxSprawl && maxSprawl > 0) {
          const scale = maxSprawl / dist;
          finalX *= scale;
          finalZ *= scale;
        }
        
        geom.translate(finalX, tip.y + dy, finalZ);
        
        // Average normals for this specific puffball to create a soft toon shading look
        averageNormalsLocal(geom, new THREE.Vector3(finalX, tip.y + dy, finalZ));
        
        foliageGeometries.push(geom);
      }
    });
  }
  
  // Find dynamic Y bounds to apply beautiful gradients
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
  
  // Apply gradient colors, foliage tagging, and generate meshes
  foliageGeometries.forEach((geom) => {
    applyFoliageColorsLocal(geom, minY, maxY, params.highlightSaturation, params.shadowDepth);
    tagFoliageLocal(geom, 1.0);
    
    const mesh = new THREE.Mesh(geom, leafMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  
  return group;
}

export function generateCustomTree(
  params: TreeParams,
  createMaterial: (colorHex: number, isFoliage: boolean, useVertexColors?: boolean) => THREE.Material
): THREE.LOD {
  const lod = new THREE.LOD();
  
  // LOD 0: High detail (0-150)
  const lod0 = createTreeTier(params, createMaterial, 0);
  lod.addLevel(lod0, 0);
  
  // LOD 1: Medium detail (150-400)
  const lod1 = createTreeTier(params, createMaterial, 1);
  lod.addLevel(lod1, 150 * params.lodMultiplier);
  
  // LOD 2: Low detail (400+)
  const lod2 = createTreeTier(params, createMaterial, 2);
  lod.addLevel(lod2, 400 * params.lodMultiplier);
  
  return lod;
}