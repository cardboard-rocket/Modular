import React, { useState } from 'react';
import { GrassSettings, GRASS_PRESETS } from '../types';
import { Leaf } from 'lucide-react';

interface ControlsProps {
  settings: GrassSettings;
  onChange: (settings: GrassSettings) => void;
}

export default function Controls({ settings, onChange }: ControlsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...settings,
      [name]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? Number(value) : value),
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full p-6 flex flex-col gap-6 overflow-y-auto shrink-0 shadow-xl z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-600" />
          Grass Generator
        </h2>
        <p className="text-sm text-gray-500 mt-1">Procedural properties</p>
      </div>
      
      <ControlGroup label="Presets">
        <select 
          className="w-full text-sm rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500"
          onChange={(e) => {
             if (e.target.value) {
                onChange({
                  ...settings,
                  ...GRASS_PRESETS[e.target.value]
                });
             }
          }}
          defaultValue="Ghibli Summer"
        >
          {Object.keys(GRASS_PRESETS).map(name => (
             <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </ControlGroup>

      <div className="space-y-6">
        <ControlGroup label="Global Settings">
          <SliderControl
            label="Field Radius"
            name="radius"
            min={1}
            max={20}
            step={0.5}
            value={settings.radius}
            onChange={handleChange}
          />
        </ControlGroup>
        
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Properties</h3>
          <ToggleControl
            label="Link Layers"
            name="propertiesLocked"
            checked={settings.propertiesLocked}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-6">
          <HighlightedGroup label="Layer 1: Moving Grass" color="green">
            <SliderControl
              label="Blade Count"
              name="count"
              min={100}
              max={100000}
              step={100}
              value={settings.count}
              onChange={handleChange}
            />
            <SliderControl
              label="Clustering Noise"
              name="noiseScale"
              min={0.01}
              max={1}
              step={0.01}
              value={settings.noiseScale}
              onChange={handleChange}
            />
            <SliderControl
              label="Placement Threshold"
              name="noiseThreshold"
              min={-1}
              max={1}
              step={0.05}
              value={settings.noiseThreshold}
              onChange={handleChange}
            />
            <div className="pt-2 border-t border-green-200/50 space-y-3">
              <SliderControl label="Width" name="width" min={0.01} max={0.2} step={0.01} value={settings.width} onChange={handleChange} />
              <SliderControl label="Height" name="height" min={0.1} max={2} step={0.05} value={settings.height} onChange={handleChange} />
              <SliderControl label="Base Curve" name="bladeCurve" min={0} max={1} step={0.01} value={settings.bladeCurve} onChange={handleChange} />
            </div>
            <div className="pt-2 border-t border-green-200/50 space-y-3">
              <SliderControl label="Wind Strength" name="windStrength" min={0} max={2} step={0.1} value={settings.windStrength} onChange={handleChange} />
              <SliderControl label="Wind Speed" name="windSpeed" min={0} max={5} step={0.1} value={settings.windSpeed} onChange={handleChange} />
              <SliderControl label="Wind Turbulence" name="windTurbulence" min={0} max={1} step={0.01} value={settings.windTurbulence} onChange={handleChange} />
            </div>
            <div className="pt-2 border-t border-green-200/50 space-y-3">
              <SliderControl label="Color Noise" name="colorNoiseScale" min={0.05} max={1.0} step={0.05} value={settings.colorNoiseScale} onChange={handleChange} />
              <ColorControl label="Base Color 1" name="baseColor" value={settings.baseColor} onChange={handleChange} />
              <ColorControl label="Tip Color 1" name="tipColor" value={settings.tipColor} onChange={handleChange} />
              <ColorControl label="Base Color 2" name="baseColorPatch" value={settings.baseColorPatch} onChange={handleChange} />
              <ColorControl label="Tip Color 2" name="tipColorPatch" value={settings.tipColorPatch} onChange={handleChange} />
            </div>
          </HighlightedGroup>

          <HighlightedGroup label="Layer 2: Static Grass" color="blue">
            <ToggleControl
              label="Enable Static Filler"
              name="fillEmptySpaces"
              checked={settings.fillEmptySpaces}
              onChange={handleChange}
            />
            {settings.fillEmptySpaces && (
              <>
                <SliderControl
                  label="Filler Count"
                  name="fillerCount"
                  min={1000}
                  max={150000}
                  step={1000}
                  value={settings.fillerCount}
                  onChange={handleChange}
                />
                <SliderControl
                  label="Filler Spread"
                  name="fillerSpread"
                  min={-0.2}
                  max={0.2}
                  step={0.01}
                  value={settings.fillerSpread}
                  onChange={handleChange}
                />
                <ToggleControl
                  label="Animate Filler (Slower)"
                  name="fillerAnimated"
                  checked={settings.fillerAnimated}
                  onChange={handleChange}
                />
                {!settings.propertiesLocked && (
                  <>
                    <div className="pt-2 border-t border-indigo-200/50 space-y-3">
                      <SliderControl label="Width" name="fillerWidth" min={0.01} max={0.2} step={0.01} value={settings.fillerWidth} onChange={handleChange} />
                      <SliderControl label="Height" name="fillerHeight" min={0.1} max={2} step={0.05} value={settings.fillerHeight} onChange={handleChange} />
                      <SliderControl label="Base Curve" name="fillerBladeCurve" min={0} max={1} step={0.01} value={settings.fillerBladeCurve} onChange={handleChange} />
                    </div>
                    {settings.fillerAnimated && (
                      <div className="pt-2 border-t border-indigo-200/50 space-y-3">
                        <SliderControl label="Wind Strength" name="fillerWindStrength" min={0} max={2} step={0.1} value={settings.fillerWindStrength} onChange={handleChange} />
                        <SliderControl label="Wind Speed" name="fillerWindSpeed" min={0} max={5} step={0.1} value={settings.fillerWindSpeed} onChange={handleChange} />
                        <SliderControl label="Wind Turbulence" name="fillerWindTurbulence" min={0} max={1} step={0.01} value={settings.fillerWindTurbulence} onChange={handleChange} />
                      </div>
                    )}
                    <div className="pt-2 border-t border-indigo-200/50 space-y-3">
                      <SliderControl label="Color Noise" name="fillerColorNoiseScale" min={0.05} max={1.0} step={0.05} value={settings.fillerColorNoiseScale} onChange={handleChange} />
                      <ColorControl label="Base Color 1" name="fillerBaseColor" value={settings.fillerBaseColor} onChange={handleChange} />
                      <ColorControl label="Tip Color 1" name="fillerTipColor" value={settings.fillerTipColor} onChange={handleChange} />
                      <ColorControl label="Base Color 2" name="fillerBaseColorPatch" value={settings.fillerBaseColorPatch} onChange={handleChange} />
                      <ColorControl label="Tip Color 2" name="fillerTipColorPatch" value={settings.fillerTipColorPatch} onChange={handleChange} />
                    </div>
                  </>
                )}
              </>
            )}
          </HighlightedGroup>
        </div>
      </div>
    </div>
  );
}

function HighlightedGroup({ label, color, children }: { label: string; color: 'green' | 'blue'; children: React.ReactNode }) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-indigo-50 border-indigo-200',
  };
  const headerColors = {
    green: 'text-green-800 border-green-200',
    blue: 'text-indigo-800 border-indigo-200',
  };
  return (
    <div className={`p-3.5 rounded-xl border ${colors[color]} space-y-3`}>
      <h3 className={`text-sm font-semibold border-b pb-1 ${headerColors[color]}`}>{label}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">{label}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SliderControl({
  label,
  name,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <label htmlFor={name} className="text-gray-700 font-medium">{label}</label>
        <span className="text-gray-500 font-mono text-xs">{value}</span>
      </div>
      <input
        type="range"
        id={name}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
      />
    </div>
  );
}

function ColorControl({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <label htmlFor={name} className="text-gray-700 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 font-mono text-xs uppercase">{value}</span>
        <input
          type="color"
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-8 h-8 rounded border border-gray-300 p-0.5 cursor-pointer"
        />
      </div>
    </div>
  );
}

function ToggleControl({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <label htmlFor={name} className="text-gray-700 font-medium cursor-pointer">{label}</label>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
      />
    </div>
  );
}
