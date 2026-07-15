/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import GrassScene from './components/GrassScene';
import Controls from './components/Controls';
import FPSCounter from './components/FPSCounter';
import { GrassSettings } from './types';

export default function App() {
  const [settings, setSettings] = useState<GrassSettings>({
    count: 25000,
    width: 0.08,
    height: 0.8,
    baseColor: '#105244',
    tipColor: '#8ee04a',
    baseColorPatch: '#0b3a30',
    tipColorPatch: '#b5f56a',
    colorNoiseScale: 0.3,
    windStrength: 0.5,
    windSpeed: 1.5,
    radius: 12,
    noiseScale: 0.2,
    noiseThreshold: 0.1,
    fillEmptySpaces: true,
    fillerCount: 50000,
    fillerSpread: 0.05,
    fillerAnimated: false,
    windTurbulence: 0.2,
    bladeCurve: 0.1,
    propertiesLocked: true,
    fillerWidth: 0.08,
    fillerHeight: 0.8,
    fillerBladeCurve: 0.1,
    fillerWindStrength: 0.5,
    fillerWindSpeed: 1.5,
    fillerWindTurbulence: 0.2,
    fillerColorNoiseScale: 0.3,
    fillerBaseColor: '#105244',
    fillerTipColor: '#8ee04a',
    fillerBaseColorPatch: '#0b3a30',
    fillerTipColorPatch: '#b5f56a',
  });

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50 font-sans">
      <main className="flex-1 relative">
        <GrassScene settings={settings} />
        
        <FPSCounter />

        {/* Helper overlay */}
        <div className="absolute top-4 left-4 pointer-events-none text-white/70 text-sm font-medium drop-shadow-md">
          <p>Drag to rotate &bull; Scroll to zoom</p>
        </div>
      </main>
      <aside>
        <Controls settings={settings} onChange={setSettings} />
      </aside>
    </div>
  );
}
