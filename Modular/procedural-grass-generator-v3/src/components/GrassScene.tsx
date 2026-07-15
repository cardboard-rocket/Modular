import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, ContactShadows, Clouds, Cloud } from '@react-three/drei';
import Grass from './Grass';
import { GrassSettings } from '../types';
import * as THREE from 'three';

interface GrassSceneProps {
  settings: GrassSettings;
}

export default function GrassScene({ settings }: GrassSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 45 }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud segments={40} bounds={[10, 2, 2]} volume={10} color="#ffffff" position={[0, 15, -20]} speed={0.2} opacity={0.8} />
        <Cloud segments={40} bounds={[10, 2, 2]} volume={10} color="#f0f0f0" position={[15, 12, -15]} speed={0.1} opacity={0.6} />
        <Cloud segments={40} bounds={[10, 2, 2]} volume={10} color="#ffffff" position={[-15, 18, -25]} speed={0.3} opacity={0.7} />
      </Clouds>

      {/* Soft Ghibli-style hemisphere lighting */}
      <hemisphereLight args={['#87CEEB', '#3b5e2b', 0.8]} />
      <ambientLight intensity={0.2} />
      
      {/* Softened directional light just for soft shadows */}
      <directionalLight
        castShadow
        position={[10, 20, 10]}
        intensity={0.6}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
      </directionalLight>

      <Grass settings={settings} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[settings.radius * 2.5, settings.radius * 2.5]} />
        <meshStandardMaterial color="#2d4c1e" roughness={0.8} />
      </mesh>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={settings.radius * 2}
        blur={2}
        far={2}
      />

      <OrbitControls
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2 - 0.05} // don't go below ground
        minDistance={2}
        maxDistance={20}
      />
    </Canvas>
  );
}
