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

const getCustomGradientColor = (y: number, minY: number, maxY: number, highlightSat: number, shadowDepth: number, species: string) => {
  const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
  
  let shadowHSL = { h: 0.55, s: 0.4, l: Math.max(0.05, 0.2 - shadowDepth * 0.15) };
  let midHSL = { h: 0.33, s: 0.65, l: 0.45 };
  let highHSL = { h: 0.22, s: Math.min(1.0, 0.4 * highlightSat), l: 0.75 };
  
  if (species === 'birch') {
    // Birch: Chartreuse-green highlights, deep rich greens for shadows
    shadowHSL = { h: 0.45, s: 0.6, l: 0.15 }; 
    midHSL = { h: 0.30, s: 0.7, l: 0.45 }; 
    highHSL = { h: 0.20, s: 0.8, l: 0.70 }; // Chartreuse-green
  } else if (species === 'pine') {
    // Pine: Deep forest-green
    shadowHSL = { h: 0.40, s: 0.6, l: 0.10 };
    midHSL = { h: 0.38, s: 0.5, l: 0.25 };
    highHSL = { h: 0.35, s: 0.4, l: 0.40 };
  } else {
    // Default (Oak/Bush): Rich layered green and deep green
    shadowHSL = { h: 0.45, s: 0.5, l: 0.12 };
    midHSL = { h: 0.33, s: 0.6, l: 0.35 };
    highHSL = { h: 0.25, s: 0.6, l: 0.60 };
  }
  
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

const applyFoliageColorsLocal = (geometry: THREE.BufferGeometry, minY: number, maxY: number, highlightSat: number, shadowDepth: number, species: string) => {
  const pos = geometry.attributes.position;
  if (!pos) return;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    // Bake AO: lower y values get darker
    const aoFactor = Math.min(1.0, Math.max(0.0, (y - minY) / ((maxY - minY) || 1)));
    const baseColor = getCustomGradientColor(y, minY, maxY, highlightSat, shadowDepth, species);
    
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
  const species = rawParams.species || 'default';

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

  if (species === 'pine') {
    params.gnarliness *= 0.1;
    params.twistIntensity *= 0.1;
  } else if (species === 'birch') {
    params.radius *= 0.4;
    params.gnarliness *= 0.3;
    params.branchLength *= 0.5;
  } else if (species === 'bush') {
    params.height = Math.min(params.height, 4.0);
  }

  const group = new THREE.Group();
  
  const rand = createPRNG(params.seed);
  
  // Trunk and Branch materials
  const trunkMat = species === 'birch' ? createMaterial(0xffffff, false, true) : createMaterial(0x5c4033, false);
  const leafMat = createMaterial(0x2e8b57, true, true); // foliage uses vertex colors!
  
  // 1. Primary Trunk (The Wood Structure)
  let trunkSegments = Math.max(12, Math.floor(12 + params.polygonWeight * 16));
  if (lodLevel === 1) trunkSegments = 6;
  const trunkHeight = params.height * 0.4; // Trunk splits at 40% height
  const segHeight = trunkHeight / trunkSegments;
  let radialSegments = Math.max(5, Math.floor(5 + params.polygonWeight * 11));
  if (lodLevel === 1) {
    radialSegments = Math.min(radialSegments, 5);
  }
  
  if (lodLevel === 2) {
    if (species !== 'bush') {
      const rBottom = params.radius * params.rootFlare;
      const rTop = params.radius * 0.3;
      const trunkHeight = params.height * 0.6;
      
      const pts = [
        { pos: new THREE.Vector3(0, 0, 0), radius: rBottom, twistIntensity: 0, baseTwist: 0, gnarliness: 0, flareIntensity: 0 },
        { pos: new THREE.Vector3(0, trunkHeight, 0), radius: rTop, twistIntensity: 0, baseTwist: 0, gnarliness: 0, flareIntensity: 0 }
      ];
      const segGeom = createContinuousBranch(pts, 4, params.height);
      if (species === 'birch') {
        const trunkColors = new Float32Array(segGeom.attributes.position.count * 3);
        for (let i = 0; i < segGeom.attributes.position.count; i++) {
           const y = segGeom.attributes.position.getY(i);
           const isBand = (Math.sin(y * 15.0) + Math.cos(y * 25.0)) > 1.2;
           const c = isBand ? new THREE.Color(0x444444) : new THREE.Color(0xf0f0f0);
           trunkColors[i*3] = c.r; trunkColors[i*3+1] = c.g; trunkColors[i*3+2] = c.b;
        }
        segGeom.setAttribute('color', new THREE.BufferAttribute(trunkColors, 3));
      }
      segGeom.computeVertexNormals();
      const seg = new THREE.Mesh(segGeom, trunkMat);
      seg.castShadow = true;
      seg.receiveShadow = true;
      group.add(seg);
    }
    
    const canopySize = params.branchLength * 1.5;
    const geom = new THREE.IcosahedronGeometry(canopySize, 0);
    geom.scale(1.0, params.foliageFlattening, 1.0);
    geom.translate(0, species === 'bush' ? canopySize * 0.5 : trunkHeight + canopySize * 0.3, 0);
    
    const colors = new Float32Array(geom.attributes.position.count * 3);
    for (let i = 0; i < geom.attributes.position.count; i++) {
       const y = geom.attributes.position.getY(i);
       const baseColor = getCustomGradientColor(y, species === 'bush' ? 0 : trunkHeight, species === 'bush' ? canopySize : trunkHeight + canopySize, params.highlightSaturation, params.shadowDepth, species);
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
  if (species !== 'bush') {
    for (let i = 0; i <= trunkSegments; i++) {
      const tStart = i / trunkSegments;
      let taper = 1.0 - tStart * 0.3;
      let rootFlareFactor = Math.pow(Math.max(0, 1 - tStart * 2.5), 2.0);
      let flareMultiplier = 1.0 + (rootFlareFactor * (params.rootFlare - 1.0));
      let radius = params.radius * taper * flareMultiplier;
      let baseBending = Math.pow(Math.max(0, Math.min(1.0, (tStart - 0.05) * 4.0)), 2.0); 
      let bendX = Math.sin(tStart * Math.PI * params.gnarliness * 2.0) * params.gnarliness * baseBending * 0.5;
      let bendZ = Math.cos(tStart * Math.PI * params.gnarliness * 2.5) * params.gnarliness * baseBending * 0.5;
      
      currentPos.set(bendX, tStart * trunkHeight, bendZ);

      trunkPoints.push({ 
        pos: currentPos.clone(), 
        radius, 
        twistIntensity: params.twistIntensity * Math.min(1.0, tStart * 3.0),
        baseTwist: 0,
        gnarliness: params.gnarliness * baseBending,
        flareIntensity: params.jointFlaring * Math.min(1.0, tStart * 3.0)
      });
    }
    
    trunkGeometries.push(createContinuousBranch(trunkPoints, radialSegments, params.height));
  }
  
  const trunkTip = trunkPoints.length > 0 ? trunkPoints[trunkPoints.length - 1].pos.clone() : new THREE.Vector3();
  
  // 2. Recursive "V-Split" Skeleton (Branches)
  const terminalNodes: THREE.Vector3[] = [];
  
  function buildBranch(startPos: THREE.Vector3, startDir: THREE.Vector3, length: number, radiusBase: number, twist: number, depth: number) {
    if (depth === 0 || (lodLevel === 1 && depth === 1)) {
      terminalNodes.push(startPos.clone());
      return;
    }
    
    const numSplits = depth === 2 ? params.branchSplits : 2;
    let branchAngle = params.branchAngle * (depth === 2 ? 1.0 : 1.2);
    branchAngle = Math.max(10, Math.min(55, branchAngle)); // Allowed tighter angles for graceful trees
    const angleRad = (branchAngle * Math.PI) / 180;
    
    const clusterOffset = rand() * Math.PI * 2;
    
    for (let b = 0; b < numSplits; b++) {
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
      
      const minUpY = Math.cos((70 * Math.PI) / 180); 
      if (bDir.y < minUpY) {
        bDir.y = minUpY;
        bDir.normalize();
      }
      
      const bSegCount = depth === 2 ? 4 : 3;
      const bTotalLen = length * (0.8 + rand() * 0.4);
      const bSegHeight = bTotalLen / bSegCount;
      
      let bPos = startPos.clone();
      let bCurrentDir = bDir.clone();
      let bTwist = twist;
      
      const actualSegHeight = depth === 1 ? bSegHeight * 1.2 : bSegHeight;
      
      const bPoints = [];
      for (let s = 0; s <= bSegCount; s++) {
        const t = s / bSegCount;
        let radius = radiusBase * (1.0 - t * 0.4);
        if (depth === 1) {
          radius = radiusBase * (1.0 - t) + 0.02 * t;
        }
        
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
      buildBranch(bPoints[bPoints.length - 1].pos, bCurrentDir, length * 0.75, radiusBase * 0.65, bTwist, depth - 1);
    }
  }

  if (species !== 'bush' && species !== 'pine') {
    buildBranch(trunkTip, currentDir, params.branchLength, params.radius * 0.65, currentTwist, 2);
  } else if (species === 'pine') {
    // Continue trunk up higher for pine
    const extraTrunkPoints = [];
    let pPos = trunkTip.clone();
    let pDir = new THREE.Vector3(0, 1, 0);
    const pineHeight = params.height * 0.5;
    const segs = 4;
    for(let i=0; i<=segs; i++){
      const t = i/segs;
      extraTrunkPoints.push({
        pos: pPos.clone(),
        radius: params.radius * 0.4 * (1-t),
        twistIntensity: 0, baseTwist: 0, gnarliness: params.gnarliness, flareIntensity: 0
      });
      pPos.add(pDir.clone().multiplyScalar(pineHeight / segs));
    }
    trunkGeometries.push(createContinuousBranch(extraTrunkPoints, radialSegments, params.height));
  }
  
  if (trunkGeometries.length > 0) {
    let mergedTrunkGeom = BufferGeometryUtils.mergeGeometries(trunkGeometries, false);
    if (mergedTrunkGeom) {
      mergedTrunkGeom = BufferGeometryUtils.mergeVertices(mergedTrunkGeom, 0.01);
      if (species === 'birch') {
        const trunkColors = new Float32Array(mergedTrunkGeom.attributes.position.count * 3);
        for (let i = 0; i < mergedTrunkGeom.attributes.position.count; i++) {
           const x = mergedTrunkGeom.attributes.position.getX(i);
           const y = mergedTrunkGeom.attributes.position.getY(i);
           const z = mergedTrunkGeom.attributes.position.getZ(i);
           const angle = Math.atan2(z, x);
           
           // Noise combination for organic peeling and lenticels
           const noise1 = Math.sin(y * 18.0 + Math.sin(angle * 2.0));
           const noise2 = Math.cos(y * 7.0 + angle * 4.0);
           const comb = noise1 + noise2;
           
           // Dark horizontal streaks (lenticels)
           const isLenticel = comb > 1.4 && Math.sin(y * 40.0 + angle) > 0.0;
           // Charcoal grey peeling
           const isPeel = comb < -1.1;
           
           let c = new THREE.Color(0xf0f4f0); // Pale white base
           if (isLenticel) c = new THREE.Color(0x2a2a2a);
           else if (isPeel) c = new THREE.Color(0x5a5e60);
           
           trunkColors[i*3] = c.r; trunkColors[i*3+1] = c.g; trunkColors[i*3+2] = c.b;
        }
        mergedTrunkGeom.setAttribute('color', new THREE.BufferAttribute(trunkColors, 3));
      }
      mergedTrunkGeom.computeVertexNormals();
      const trunkMesh = new THREE.Mesh(mergedTrunkGeom, trunkMat);
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      group.add(trunkMesh);
    }
  }

  // 3. Foliage Clumping with Sky Holes & Jitter at Terminal Nodes
  const foliageGeometries: THREE.BufferGeometry[] = [];
  
  if (species === 'pine') {
    const numTiers = 5 + Math.floor(rand() * 4); // 5 to 8 tiers
    const foliageStartY = params.height * 0.15; 
    const remainingHeight = params.height * 1.0 - foliageStartY;
    
    for (let i = 0; i < numTiers; i++) {
      const t = i / numTiers;
      
      const tierRadius = params.branchLength * 1.5 * (1 - Math.pow(t, 1.2));
      const tierHeight = (remainingHeight / numTiers) * 2.0;
      
      const tierY = foliageStartY + (remainingHeight * t);
      const numBoughs = Math.max(3, Math.floor(7 * (1 - t)) + 3);
      
      const tierOffsetPhase = rand() * Math.PI * 2;
      
      for (let j = 0; j < numBoughs; j++) {
        const angle = tierOffsetPhase + (j / numBoughs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
        const boughLen = tierRadius * (0.7 + rand() * 0.4);
        const boughWidth = boughLen * 0.8;
        const boughThickness = tierHeight * 0.4;
        
        // Use squashed icosahedrons for each bough cluster
        const detail = lodLevel === 1 ? 0 : Math.max(0, Math.min(2, Math.round(params.polygonWeight * 2)));
        const geom = new THREE.IcosahedronGeometry(1.0, detail);
        geom.scale(boughWidth, boughThickness, boughLen);
        
        if (lodLevel === 0) applyLeafJitter(geom, params.leafJitter, rand);
        
        // Push outwards
        geom.translate(0, 0, boughLen * 0.5);
        
        // Droop slightly
        const droop = -0.15 - (1 - t) * 0.3;
        geom.rotateX(droop);
        
        // Rotate around trunk
        geom.rotateY(angle);
        
        // Jitter height slightly per bough
        const jitterY = (rand() - 0.5) * tierHeight * 0.3;
        
        geom.translate(0, tierY + jitterY, 0);
        
        // Smooth normals outwards/downwards
        averageNormalsLocal(geom, new THREE.Vector3(0, tierY - boughThickness, 0));
        
        foliageGeometries.push(geom);
      }
    }
    
    // Top spike
    const topDetail = lodLevel === 1 ? 0 : Math.max(0, Math.min(1, Math.round(params.polygonWeight * 2)));
    const topGeom = new THREE.IcosahedronGeometry(params.branchLength * 0.4, topDetail);
    topGeom.scale(0.8, 2.5, 0.8);
    topGeom.translate(0, params.height + 0.2, 0);
    averageNormalsLocal(topGeom, new THREE.Vector3(0, params.height, 0));
    foliageGeometries.push(topGeom);
  } else if (species === 'bush') {
    const numSpheres = params.puffballCount * 3 + 10;
    for (let i = 0; i < numSpheres; i++) {
      const size = params.puffballSize * (0.8 + rand() * 0.6);
      const detail = lodLevel === 1 ? 0 : Math.max(0, Math.min(2, Math.round(params.polygonWeight * 2)));
      const geom = new THREE.IcosahedronGeometry(size, detail);
      geom.scale(1.0, params.foliageFlattening, 1.0);
      if (lodLevel === 0) applyLeafJitter(geom, params.leafJitter * size, rand);
      
      const phi = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * params.branchLength * 1.5;
      
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      const domeHeight = Math.max(0, 1 - (r / (params.branchLength * 1.5))) * params.branchLength;
      const y = size * params.foliageFlattening * 0.5 + rand() * domeHeight * 0.5;
      
      geom.translate(x, y, z);
      averageNormalsLocal(geom, new THREE.Vector3(x, y, z));
      foliageGeometries.push(geom);
    }
  } else {
    const validTips = terminalNodes;
    if (validTips.length > 0) {
      validTips.forEach(tip => {
        const isBirch = species === 'birch';
        const puffballMultiplier = isBirch ? 2.5 : 1.0;
        const puffballCount = lodLevel === 1 ? Math.min(params.puffballCount * puffballMultiplier, 3 + Math.floor(rand() * 2)) : Math.floor(params.puffballCount * puffballMultiplier);
        
        for (let i = 0; i < puffballCount; i++) {
          const phi = i * 1.6180339887 * Math.PI * 2;
          const rOffset = Math.pow(i / puffballCount, 0.6) * (params.puffballSize * (isBirch ? 1.2 : 1.6));
          const isMain = i === 0 && !isBirch; // Birch doesn't have a single dominant center
          
          let sizeBase = (0.6 + rand() * 0.4);
          if (isMain) sizeBase = 1.0;
          if (isBirch) sizeBase *= 0.6; // Smaller tufts for Birch
          
          const size = params.puffballSize * sizeBase * (lodLevel === 1 ? 1.3 : 1.0);
          
          let geom;
          if (lodLevel === 1) {
            geom = new THREE.IcosahedronGeometry(size, 0);
          } else {
            const detail = Math.max(0, Math.min(isBirch ? 1 : 2, Math.round(params.polygonWeight * (isBirch ? 1.5 : 2.0))));
            geom = new THREE.IcosahedronGeometry(size, detail);
          }
          
          const flattening = isBirch ? params.foliageFlattening * 0.6 : params.foliageFlattening;
          geom.scale(1.0, flattening, 1.0);
          if (lodLevel === 0) applyLeafJitter(geom, params.leafJitter * size * (isBirch ? 1.5 : 1.0), rand);
          
          let dx = Math.cos(phi) * rOffset;
          let dz = Math.sin(phi) * rOffset;
          
          let dy = (rand() - 0.2) * (params.puffballSize * 0.2) * flattening;
          if (isBirch) {
             // Create a tall, graceful canopy by extending tufts down the trunk line
             // The further 'i' is in the loop, the further down it goes
             const drop = (i / puffballCount) * (params.height * 0.5);
             dy = -drop + (rand() - 0.5) * params.puffballSize;
          }
          
          let finalX = tip.x + dx;
          let finalZ = tip.z + dz;
          const maxSprawl = params.height * (isBirch ? 0.25 : 0.6); // Birch is narrower/more graceful
          const dist = Math.sqrt(finalX * finalX + finalZ * finalZ);
          if (dist > maxSprawl && maxSprawl > 0) {
            const scale = maxSprawl / dist;
            finalX *= scale;
            finalZ *= scale;
          }
          
          geom.translate(finalX, tip.y + dy, finalZ);
          
          // Birch normals can point down more to create sharp layered shadows
          const normalTargetY = tip.y + dy - (isBirch ? size * 0.8 : 0);
          averageNormalsLocal(geom, new THREE.Vector3(finalX, normalTargetY, finalZ));
          foliageGeometries.push(geom);
        }
      });
    }
  }
  
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
  
  foliageGeometries.forEach((geom) => {
    applyFoliageColorsLocal(geom, minY, maxY, params.highlightSaturation, params.shadowDepth, species);
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