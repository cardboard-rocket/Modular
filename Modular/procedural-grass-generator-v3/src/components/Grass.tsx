import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';
import { GrassSettings } from '../types';

interface GrassProps {
  settings: GrassSettings;
}

export default function Grass({ settings }: GrassProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const shaderRef = useRef<any | null>(null);

  const fillerMeshRef = useRef<THREE.InstancedMesh>(null);
  const fillerMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const fillerShaderRef = useRef<any | null>(null);

  // Recreate geometry when width or height change
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(settings.width, settings.height, 1, 3);
    geo.translate(0, settings.height / 2, 0); // Move origin to bottom
    
    // Taper the top and curve
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const ratio = y / settings.height;
      const x = pos.getX(i);
      // Pinch the top
      pos.setX(i, x * (1 - ratio));
      
      // Slight curve in Z to give volume (V-shape)
      const curve = Math.sin(Math.PI * (x / settings.width)) * settings.width * 0.5;
      pos.setZ(i, curve * (1 - ratio));
    }
    geo.computeVertexNormals();
    
    // Override normals to point up for soft foliage shading
    const normals = geo.attributes.normal;
    for (let i = 0; i < normals.count; i++) {
      // Point mostly up, with a slight outward tilt based on X
      normals.setXYZ(i, pos.getX(i) * 0.5, 1.0, 0.0);
    }
    normals.needsUpdate = true;
    
    return geo;
  }, [settings.width, settings.height]);

  const fillerGeometry = useMemo(() => {
    const fWidth = settings.propertiesLocked ? settings.width : settings.fillerWidth;
    const fHeight = settings.propertiesLocked ? settings.height : settings.fillerHeight;
    const geo = new THREE.PlaneGeometry(fWidth, fHeight, 1, 3);
    geo.translate(0, fHeight / 2, 0);
    
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const ratio = y / fHeight;
      const x = pos.getX(i);
      pos.setX(i, x * (1 - ratio));
      
      const curve = Math.sin(Math.PI * (x / fWidth)) * fWidth * 0.5;
      pos.setZ(i, curve * (1 - ratio));
    }
    geo.computeVertexNormals();
    
    const normals = geo.attributes.normal;
    for (let i = 0; i < normals.count; i++) {
      normals.setXYZ(i, pos.getX(i) * 0.5, 1.0, 0.0);
    }
    normals.needsUpdate = true;
    
    return geo;
  }, [settings.propertiesLocked, settings.width, settings.height, settings.fillerWidth, settings.fillerHeight]);

  // Generate instances' matrices
  const [matrices, setMatrices] = useState<Float32Array>(() => new Float32Array(0));
  const [actualCount, setActualCount] = useState(0);

  const [fillerMatrices, setFillerMatrices] = useState<Float32Array>(() => new Float32Array(0));
  const [actualFillerCount, setActualFillerCount] = useState(0);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const count = settings.count;
    const radius = settings.radius;
    const noise2D = createNoise2D();
    
    const tempMatrices = [];
    const tempFillerMatrices = [];
    
    for (let i = 0; i < count; i++) {
      const r = radius * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const noiseValue = noise2D(x * settings.noiseScale, z * settings.noiseScale);
      
      if (noiseValue > settings.noiseThreshold) {
        const rotY = Math.random() * Math.PI;
        
        // Scale based on noise value (center of cluster is taller)
        const normalizedNoise = Math.max(0, (noiseValue - settings.noiseThreshold) / (1 - settings.noiseThreshold));
        const scaleHeight = 0.5 + normalizedNoise * 0.5 + Math.random() * 0.2;
        const scaleWidth = 0.6 + Math.random() * 0.6;
        
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(scaleWidth, scaleHeight, scaleWidth);
        dummy.updateMatrix();
        
        tempMatrices.push(...dummy.matrix.toArray());
      }
    }

    if (settings.fillEmptySpaces) {
      const fillerCount = settings.fillerCount || 50000;
      for (let i = 0; i < fillerCount; i++) {
        const r = radius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        
        const noiseValue = noise2D(x * settings.noiseScale, z * settings.noiseScale);
        
        if (noiseValue <= settings.noiseThreshold + (settings.fillerSpread || 0)) {
          const rotY = Math.random() * Math.PI;
          
          const scaleHeight = 0.3 + Math.random() * 0.2;
          const scaleWidth = 0.6 + Math.random() * 0.4;
          
          dummy.position.set(x, 0, z);
          dummy.rotation.set(0, rotY, 0);
          dummy.scale.set(scaleWidth, scaleHeight, scaleWidth);
          dummy.updateMatrix();
          
          tempFillerMatrices.push(...dummy.matrix.toArray());
        }
      }
    }
    
    setActualCount(tempMatrices.length / 16);
    setMatrices(new Float32Array(tempMatrices));

    setActualFillerCount(tempFillerMatrices.length / 16);
    setFillerMatrices(new Float32Array(tempFillerMatrices));
  }, [settings.count, settings.radius, settings.noiseScale, settings.noiseThreshold, settings.fillEmptySpaces, settings.fillerCount, settings.fillerSpread]);

  useEffect(() => {
    if (meshRef.current && matrices.length > 0) {
      meshRef.current.instanceMatrix.array.set(matrices);
      meshRef.current.instanceMatrix.needsUpdate = true;
      // We also need to update the bounding sphere for proper culling
      meshRef.current.computeBoundingSphere();
    }
  }, [matrices, geometry]);

  useEffect(() => {
    if (fillerMeshRef.current && fillerMatrices.length > 0) {
      fillerMeshRef.current.instanceMatrix.array.set(fillerMatrices);
      fillerMeshRef.current.instanceMatrix.needsUpdate = true;
      fillerMeshRef.current.computeBoundingSphere();
    }
  }, [fillerMatrices, fillerGeometry]);

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.time = { value: 0 };
    shader.uniforms.windStrength = { value: settings.windStrength };
    shader.uniforms.windSpeed = { value: settings.windSpeed };
    shader.uniforms.windTurbulence = { value: settings.windTurbulence };
    shader.uniforms.bladeCurve = { value: settings.bladeCurve };
    
    // Base colors
    shader.uniforms.colorBase = { value: new THREE.Color(settings.baseColor) };
    shader.uniforms.colorTip = { value: new THREE.Color(settings.tipColor) };
    
    // Patch colors
    shader.uniforms.colorBasePatch = { value: new THREE.Color(settings.baseColorPatch) };
    shader.uniforms.colorTipPatch = { value: new THREE.Color(settings.tipColorPatch) };
    
    shader.uniforms.colorNoiseScale = { value: settings.colorNoiseScale };
    shader.uniforms.grassHeight = { value: settings.height };
    
    shaderRef.current = shader;
    
    shader.vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform float windSpeed;
      uniform float windTurbulence;
      uniform float bladeCurve;
      uniform float colorNoiseScale;
      uniform float grassHeight;
      varying float vRatio;
      varying float vColorMix;
      ` + shader.vertexShader;
      
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      vRatio = position.y / grassHeight;
      
      // Calculate wind based on world position
      vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      // Compute color variation noise
      float cx = worldPos.x * colorNoiseScale;
      float cz = worldPos.z * colorNoiseScale;
      float colorNoise = sin(cx) * cos(cz) + sin(cx * 2.1 + 1.5) * cos(cz * 2.3 + 0.5) * 0.5;
      vColorMix = smoothstep(-1.0, 1.0, colorNoise);
      
      // Sweeping wind movement: sin((Px * fx) + (Pz * fz) + (t * s)) * (vRatio * A)
      float fx = 0.5;
      float fz = 0.5;
      float windNoise = sin((worldPos.x * fx) + (worldPos.z * fz) + (time * windSpeed));
      
      // High frequency turbulence
      float turb = sin((worldPos.x * 2.0) + (worldPos.z * 2.0) + (time * windSpeed * 2.0)) * windTurbulence;
      windNoise += turb;
      
      // Bend curve
      float bend = pow(vRatio, 1.5) * windStrength * windNoise;
      
      // Natural blade curve
      float natCurve = pow(vRatio, 2.0) * bladeCurve;
      
      // Apply bend direction
      transformed.x += bend + natCurve;
      transformed.z += bend * 0.5 + natCurve * 0.5;
      `
    );
    
    shader.fragmentShader = `
      uniform vec3 colorBase;
      uniform vec3 colorTip;
      uniform vec3 colorBasePatch;
      uniform vec3 colorTipPatch;
      varying float vRatio;
      varying float vColorMix;
      ` + shader.fragmentShader;
      
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      `
      // Mix base and patch colors based on world position noise
      vec3 mixedBase = mix(colorBase, colorBasePatch, vColorMix);
      vec3 mixedTip = mix(colorTip, colorTipPatch, vColorMix);
      
      // Ghibli Color Gradient: Smoothstep creates a non-linear, softer transition
      float mixFactor = smoothstep(0.1, 0.9, vRatio);
      vec3 mixedColor = mix(mixedBase, mixedTip, mixFactor);
      
      vec4 diffuseColor = vec4( mixedColor, opacity );
      `
    );
  };
  
  const onBeforeCompileFiller = (shader: any) => {
    // Base colors
    shader.uniforms.colorBase = { value: new THREE.Color(settings.propertiesLocked ? settings.baseColor : settings.fillerBaseColor) };
    shader.uniforms.colorTip = { value: new THREE.Color(settings.propertiesLocked ? settings.tipColor : settings.fillerTipColor) };
    
    // Patch colors
    shader.uniforms.colorBasePatch = { value: new THREE.Color(settings.propertiesLocked ? settings.baseColorPatch : settings.fillerBaseColorPatch) };
    shader.uniforms.colorTipPatch = { value: new THREE.Color(settings.propertiesLocked ? settings.tipColorPatch : settings.fillerTipColorPatch) };
    
    shader.uniforms.colorNoiseScale = { value: settings.propertiesLocked ? settings.colorNoiseScale : settings.fillerColorNoiseScale };
    shader.uniforms.grassHeight = { value: settings.propertiesLocked ? settings.height : settings.fillerHeight };
    shader.uniforms.bladeCurve = { value: settings.propertiesLocked ? settings.bladeCurve : settings.fillerBladeCurve };
    shader.uniforms.time = { value: 0 };
    shader.uniforms.windStrength = { value: settings.propertiesLocked ? settings.windStrength : settings.fillerWindStrength };
    shader.uniforms.windSpeed = { value: settings.propertiesLocked ? settings.windSpeed : settings.fillerWindSpeed };
    shader.uniforms.windTurbulence = { value: settings.propertiesLocked ? settings.windTurbulence : settings.fillerWindTurbulence };
    
    fillerShaderRef.current = shader;
    
    shader.vertexShader = `
      uniform float colorNoiseScale;
      uniform float grassHeight;
      uniform float bladeCurve;
      ${settings.fillerAnimated ? `
      uniform float time;
      uniform float windStrength;
      uniform float windSpeed;
      uniform float windTurbulence;
      ` : ''}
      varying float vRatio;
      varying float vColorMix;
      ` + shader.vertexShader;
      
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      vRatio = position.y / grassHeight;
      
      vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      float cx = worldPos.x * colorNoiseScale;
      float cz = worldPos.z * colorNoiseScale;
      float colorNoise = sin(cx) * cos(cz) + sin(cx * 2.1 + 1.5) * cos(cz * 2.3 + 0.5) * 0.5;
      vColorMix = smoothstep(-1.0, 1.0, colorNoise);
      
      float natCurve = pow(vRatio, 2.0) * bladeCurve;
      
      ${settings.fillerAnimated ? `
      float fx = 0.5;
      float fz = 0.5;
      float windNoise = sin((worldPos.x * fx) + (worldPos.z * fz) + (time * windSpeed));
      float turb = sin((worldPos.x * 2.0) + (worldPos.z * 2.0) + (time * windSpeed * 2.0)) * windTurbulence;
      windNoise += turb;
      float bend = pow(vRatio, 1.5) * windStrength * windNoise;
      
      transformed.x += bend + natCurve;
      transformed.z += bend * 0.5 + natCurve * 0.5;
      ` : `
      transformed.x += natCurve;
      transformed.z += natCurve * 0.5;
      `}
      `
    );
    
    shader.fragmentShader = `
      uniform vec3 colorBase;
      uniform vec3 colorTip;
      uniform vec3 colorBasePatch;
      uniform vec3 colorTipPatch;
      varying float vRatio;
      varying float vColorMix;
      ` + shader.fragmentShader;
      
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      `
      vec3 mixedBase = mix(colorBase, colorBasePatch, vColorMix);
      vec3 mixedTip = mix(colorTip, colorTipPatch, vColorMix);
      
      float mixFactor = smoothstep(0.1, 0.9, vRatio);
      vec3 mixedColor = mix(mixedBase, mixedTip, mixFactor);
      
      vec4 diffuseColor = vec4( mixedColor, opacity );
      `
    );
  };

  // Update uniforms when settings change
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.windStrength.value = settings.windStrength;
      shaderRef.current.uniforms.windSpeed.value = settings.windSpeed;
      shaderRef.current.uniforms.windTurbulence.value = settings.windTurbulence;
      shaderRef.current.uniforms.bladeCurve.value = settings.bladeCurve;
      
      shaderRef.current.uniforms.colorBase.value.set(settings.baseColor);
      shaderRef.current.uniforms.colorTip.value.set(settings.tipColor);
      shaderRef.current.uniforms.colorBasePatch.value.set(settings.baseColorPatch);
      shaderRef.current.uniforms.colorTipPatch.value.set(settings.tipColorPatch);
      shaderRef.current.uniforms.colorNoiseScale.value = settings.colorNoiseScale;
      
      shaderRef.current.uniforms.grassHeight.value = settings.height;
    }

    if (fillerShaderRef.current) {
      fillerShaderRef.current.uniforms.bladeCurve.value = settings.propertiesLocked ? settings.bladeCurve : settings.fillerBladeCurve;
      fillerShaderRef.current.uniforms.windStrength.value = settings.propertiesLocked ? settings.windStrength : settings.fillerWindStrength;
      fillerShaderRef.current.uniforms.windSpeed.value = settings.propertiesLocked ? settings.windSpeed : settings.fillerWindSpeed;
      fillerShaderRef.current.uniforms.windTurbulence.value = settings.propertiesLocked ? settings.windTurbulence : settings.fillerWindTurbulence;
      fillerShaderRef.current.uniforms.colorBase.value.set(settings.propertiesLocked ? settings.baseColor : settings.fillerBaseColor);
      fillerShaderRef.current.uniforms.colorTip.value.set(settings.propertiesLocked ? settings.tipColor : settings.fillerTipColor);
      fillerShaderRef.current.uniforms.colorBasePatch.value.set(settings.propertiesLocked ? settings.baseColorPatch : settings.fillerBaseColorPatch);
      fillerShaderRef.current.uniforms.colorTipPatch.value.set(settings.propertiesLocked ? settings.tipColorPatch : settings.fillerTipColorPatch);
      fillerShaderRef.current.uniforms.colorNoiseScale.value = settings.propertiesLocked ? settings.colorNoiseScale : settings.fillerColorNoiseScale;
      fillerShaderRef.current.uniforms.grassHeight.value = settings.propertiesLocked ? settings.height : settings.fillerHeight;
    }
  }, [settings]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    if (fillerShaderRef.current) {
      fillerShaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, Math.max(1, actualCount)]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          ref={materialRef}
          side={THREE.DoubleSide}
          roughness={0.6}
          onBeforeCompile={onBeforeCompile}
          customProgramCacheKey={() => 'grassShader_animated_v1'}
        />
      </instancedMesh>
      
      {settings.fillEmptySpaces && (
        <instancedMesh
          ref={fillerMeshRef}
          args={[fillerGeometry, undefined, Math.max(1, actualFillerCount)]}
        >
          <meshStandardMaterial
            ref={fillerMaterialRef}
            side={THREE.DoubleSide}
            roughness={0.6}
            onBeforeCompile={onBeforeCompileFiller}
            customProgramCacheKey={() => `grassShader_static_v1_${settings.fillerAnimated}`}
          />
        </instancedMesh>
      )}
    </group>
  );
}
