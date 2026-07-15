/**
 * editor-env.js - Developer Environmental, Post-Processing, & Toon Shader Controller
 * Contains right-side minimalist UI controls, real-time color pickers, terrain height/scale properties,
 * and individual toon shader settings.
 */
import * as THREE from 'three';

export function initEditor(options) {
    const {
        scene,
        dirLight,
        ambientLight,
        waterUniforms,
        bloomPass,
        toggleEditorMode,
        getEditorMode,
        getBrushMode,
        setBrushMode,
        getBrushSize,
        setBrushSize,
        clearSplatGrid,
        getFlySpeedMultiplier,
        setFlySpeedMultiplier,
        
        // Custom Toon & Color shader uniforms passed from index.html
        terrainToonUniforms,
        treeToonUniforms,
        waterToonUniforms,
        customColors,
        terrainColorUniforms,
        summerPass,
        rebuildTerrain,
        triggerMinimapUpdate,
        getMinimapZoom,
        setMinimapZoom
    } = options;

    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #editor-panel {
            position: fixed;
            right: 16px;
            top: 16px;
            bottom: 16px;
            width: 280px;
            background: rgba(20, 20, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0px;
            color: #cbd5e1;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #editor-panel.collapsed {
            transform: translateX(300px);
        }
        #editor-toggle-btn {
            position: absolute;
            left: -34px;
            top: 0px;
            width: 32px;
            height: 32px;
            background: rgba(20, 20, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-right: none;
            border-radius: 0px;
            color: #f1f5f9;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            backdrop-filter: blur(8px);
        }
        .editor-header {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: bold;
            color: #38bdf8;
            letter-spacing: 0.05em;
        }
        .editor-body {
            padding: 12px;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        details.editor-section {
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            padding: 8px;
        }
        details.editor-section summary {
            font-weight: bold;
            color: #ffd166;
            cursor: pointer;
            outline: none;
            list-style: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        details.editor-section summary::-webkit-details-marker {
            display: none;
        }
        details.editor-section[open] summary {
            margin-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 4px;
        }
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 10px;
        }
        .control-label {
            display: flex;
            justify-content: space-between;
            color: #94a3b8;
            font-size: 11px;
        }
        .editor-slider {
            width: 100%;
            accent-color: #38bdf8;
            cursor: pointer;
            background: #334155;
            height: 4px;
            border-radius: 0px;
            border: none;
        }
        .editor-btn {
            background: #1e3a8a;
            color: #cbd5e1;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 6px 12px;
            font-family: monospace;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            width: 100%;
            margin-bottom: 8px;
        }
        .editor-btn:hover {
            background: #1e40af;
            color: white;
        }
        .editor-btn-active {
            background: #064e3b !important;
            border-color: #10b981 !important;
            color: #34d399 !important;
        }
        .btn-danger {
            background: #7f1d1d !important;
            border-color: #ef4444 !important;
            color: #fca5a5 !important;
        }
        .btn-danger:hover {
            background: #991b1b !important;
        }
        .select-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .select-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            padding: 5px;
            cursor: pointer;
            text-align: left;
            font-family: monospace;
            font-size: 11px;
        }
        .select-btn.active {
            background: rgba(56, 189, 248, 0.2);
            color: #38bdf8;
            border-color: #38bdf8;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    // Create Panel DOM
    const panel = document.createElement('div');
    panel.id = 'editor-panel';
    panel.className = 'collapsed'; // Collapsed by default
    panel.innerHTML = `
        <button id="editor-toggle-btn" title="Toggle Developer Panel">🛠️</button>
        <div class="editor-header">EDITOR SYSTEM</div>
        <div class="editor-body">
            
            <!-- SECTION 1: SYSTEM MODE -->
            <details class="editor-section" open>
                <summary>1. System Mode <span>[+]</span></summary>
                <button id="editor-mode-btn" class="editor-btn">Enter Editor [P]</button>
                <div id="editor-speed-group" class="control-group" style="display:none;">
                    <div class="control-label">Fly Speed: <span id="val-fly-speed">1.0x</span></div>
                    <input type="range" id="slider-fly-speed" class="editor-slider" min="0.1" max="10" step="0.1" value="1.0">
                </div>
            </details>

            <!-- SECTION 2: TERRAIN COLORS & PROPERTIES -->
            <details class="editor-section">
                <summary>2. Terrain Colors & Props <span>[+]</span></summary>
                <div class="control-group">
                    <label class="control-label" style="flex-direction: row; gap: 8px; justify-content: flex-start; cursor: pointer; align-items: center;">
                        <input type="checkbox" id="check-color-override"> Enable Custom Colors
                    </label>
                </div>
                <div class="control-group">
                    <div class="control-label">Grass Color:</div>
                    <input type="color" id="picker-color-grass" value="#389c45" style="width:100%; height:25px; border:none; background:none; cursor:pointer;">
                </div>
                <div class="control-group">
                    <div class="control-label">Slope/Dirt Color:</div>
                    <input type="color" id="picker-color-dirt" value="#dcb58a" style="width:100%; height:25px; border:none; background:none; cursor:pointer;">
                </div>
                <div class="control-group">
                    <div class="control-label">Sand/Shore Color:</div>
                    <input type="color" id="picker-color-sand" value="#f2e1b8" style="width:100%; height:25px; border:none; background:none; cursor:pointer;">
                </div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.08); margin:8px 0;">
                <div class="control-group">
                    <div class="control-label">Noise Scale: <span id="val-noise-scale">1.00x</span></div>
                    <input type="range" id="slider-noise-scale" class="editor-slider" min="0.1" max="3.0" step="0.05" value="1.0">
                </div>
                <div class="control-group">
                    <div class="control-label">Height Multiplier: <span id="val-height-mult">1.00x</span></div>
                    <input type="range" id="slider-height-mult" class="editor-slider" min="0.1" max="3.0" step="0.05" value="1.0">
                </div>
            </details>

            <!-- SECTION 3: TOON SHADER SETTINGS -->
            <details class="editor-section">
                <summary>3. Toon Shader Settings <span>[+]</span></summary>
                <div class="control-group" style="gap:6px;">
                    <label class="control-label" style="flex-direction: row; gap: 8px; justify-content: flex-start; cursor: pointer; align-items: center;">
                        <input type="checkbox" id="check-toon-terrain" checked> Toon Terrain
                    </label>
                    <label class="control-label" style="flex-direction: row; gap: 8px; justify-content: flex-start; cursor: pointer; align-items: center;">
                        <input type="checkbox" id="check-toon-trees" checked> Toon Trees
                    </label>
                    <label class="control-label" style="flex-direction: row; gap: 8px; justify-content: flex-start; cursor: pointer; align-items: center;">
                        <input type="checkbox" id="check-toon-water" checked> Toon Water
                    </label>
                </div>
                <div class="control-group">
                    <div class="control-label">Lighting Steps: <span id="val-toon-steps">3</span></div>
                    <input type="range" id="slider-toon-steps" class="editor-slider" min="1" max="15" step="1" value="3">
                </div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.08); margin:8px 0;">
                <div class="control-group">
                    <label class="control-label" style="flex-direction: row; gap: 8px; justify-content: flex-start; cursor: pointer; align-items: center;">
                        <input type="checkbox" id="check-outline-enabled" checked> Enable Outlines
                    </label>
                </div>
                <div class="control-group">
                    <div class="control-label">Outline Thickness: <span id="val-outline-thick">1.5px</span></div>
                    <input type="range" id="slider-outline-thick" class="editor-slider" min="0.5" max="5.0" step="0.1" value="1.5">
                </div>
                <div class="control-group">
                    <div class="control-label">Outline Color:</div>
                    <input type="color" id="picker-outline-color" value="#000000" style="width:100%; height:25px; border:none; background:none; cursor:pointer;">
                </div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.08); margin:8px 0;">
                <div class="control-group">
                    <div class="control-label">Rim Light Intensity: <span id="val-rim-strength">0.35</span></div>
                    <input type="range" id="slider-rim-strength" class="editor-slider" min="0.0" max="1.5" step="0.05" value="0.35">
                </div>
                <div class="control-group">
                    <div class="control-label">Rim Light Color:</div>
                    <input type="color" id="picker-rim-color" value="#ffffff" style="width:100%; height:25px; border:none; background:none; cursor:pointer;">
                </div>
            </details>

            <!-- SECTION 4: ENVIRONMENT & ATMOSPHERE -->
            <details class="editor-section">
                <summary>4. Env & Atmosphere <span>[+]</span></summary>
                <div class="control-group">
                    <div class="control-label">Fog Density: <span id="val-fog-density">0.0005</span></div>
                    <input type="range" id="slider-fog-density" class="editor-slider" min="0" max="0.005" step="0.0001" value="0.0005">
                </div>
                <div class="control-group">
                    <div class="control-label">Cloud Height: <span id="val-cloud-height">150m</span></div>
                    <input type="range" id="slider-cloud-height" class="editor-slider" min="50" max="800" step="10" value="150">
                </div>
                <div class="control-group">
                    <div class="control-label">Cloud Speed: <span id="val-cloud-speed">1.0x</span></div>
                    <input type="range" id="slider-cloud-speed" class="editor-slider" min="0" max="5" step="0.1" value="1.0">
                </div>
                <div class="control-group">
                    <div class="control-label">Bloom Glow: <span id="val-bloom-str">0.15</span></div>
                    <input type="range" id="slider-bloom-str" class="editor-slider" min="0" max="2" step="0.02" value="0.15">
                </div>
            </details>

            <!-- SECTION 5: BRUSH & MAP SETTINGS -->
            <details id="editor-brush-section" class="editor-section" style="display:none;">
                <summary>5. Brush & Map Settings <span>[+]</span></summary>
                <div class="control-group">
                    <div class="control-label">Brush Mode</div>
                    <div class="select-group">
                        <button class="select-btn active" data-mode="rotate">Rotate Camera</button>
                        <button class="select-btn" data-mode="write">Paint: Draw Trees</button>
                        <button class="select-btn" data-mode="erase">Paint: Erase (Block)</button>
                        <button class="select-btn" data-mode="water">Paint: Carve Water</button>
                    </div>
                </div>
                <div class="control-group">
                    <div class="control-label">Brush Size: <span id="val-brush-size">40m</span></div>
                    <input type="range" id="slider-brush-size" class="editor-slider" min="10" max="150" value="40">
                </div>
                <div class="control-group">
                    <div class="control-label">Brush Softness: <span id="val-brush-softness">0.50</span></div>
                    <input type="range" id="slider-brush-softness" class="editor-slider" min="0.0" max="1.0" step="0.05" value="0.50">
                </div>
                <div class="control-group">
                    <div class="control-label">Map Zoom/Scale: <span id="val-map-zoom">1.0x</span></div>
                    <input type="range" id="slider-map-zoom" class="editor-slider" min="0.2" max="4.0" step="0.1" value="1.0">
                </div>
                <button id="btn-clear-paint" class="editor-btn btn-danger">Clear Paint Map</button>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.08); margin:8px 0;">
                <button id="btn-save-local" class="editor-btn">Save to LocalStorage</button>
                <button id="btn-export-json" class="editor-btn">Export JSON</button>
                <button id="btn-import-json" class="editor-btn">Import JSON</button>
                <input type="file" id="file-import-json" style="display:none;" accept=".json">
            </details>

        </div>
    `;
    document.body.appendChild(panel);

    // Dom Elements
    const toggleBtn = document.getElementById('editor-toggle-btn');
    const modeBtn = document.getElementById('editor-mode-btn');
    const brushSection = document.getElementById('editor-brush-section');
    const speedGroup = document.getElementById('editor-speed-group');
    const sliderFlySpeed = document.getElementById('slider-fly-speed');
    const valFlySpeed = document.getElementById('val-fly-speed');
    const sliderBrushSize = document.getElementById('slider-brush-size');
    const valBrushSize = document.getElementById('val-brush-size');
    const clearPaintBtn = document.getElementById('btn-clear-paint');

    const sliderFogDensity = document.getElementById('slider-fog-density');
    const valFogDensity = document.getElementById('val-fog-density');

    const sliderCloudHeight = document.getElementById('slider-cloud-height');
    const valCloudHeight = document.getElementById('val-cloud-height');
    const sliderCloudSpeed = document.getElementById('slider-cloud-speed');
    const valCloudSpeed = document.getElementById('val-cloud-speed');

    const sliderBloomStr = document.getElementById('slider-bloom-str');
    const valBloomStr = document.getElementById('val-bloom-str');

    // Section 2: Colors & Props
    const checkColorOverride = document.getElementById('check-color-override');
    const pickerColorGrass = document.getElementById('picker-color-grass');
    const pickerColorDirt = document.getElementById('picker-color-dirt');
    const pickerColorSand = document.getElementById('picker-color-sand');
    const sliderNoiseScale = document.getElementById('slider-noise-scale');
    const valNoiseScale = document.getElementById('val-noise-scale');
    const sliderHeightMult = document.getElementById('slider-height-mult');
    const valHeightMult = document.getElementById('val-height-mult');

    // Section 3: Toon Shaders
    const checkToonTerrain = document.getElementById('check-toon-terrain');
    const checkToonTrees = document.getElementById('check-toon-trees');
    const checkToonWater = document.getElementById('check-toon-water');
    const sliderToonSteps = document.getElementById('slider-toon-steps');
    const valToonSteps = document.getElementById('val-toon-steps');
    const checkOutlineEnabled = document.getElementById('check-outline-enabled');
    const sliderOutlineThick = document.getElementById('slider-outline-thick');
    const valOutlineThick = document.getElementById('val-outline-thick');
    const pickerOutlineColor = document.getElementById('picker-outline-color');
    const sliderRimStrength = document.getElementById('slider-rim-strength');
    const valRimStrength = document.getElementById('val-rim-strength');
    const pickerRimColor = document.getElementById('picker-rim-color');

    // Section 5: Map Zoom
    const sliderMapZoom = document.getElementById('slider-map-zoom');
    const valMapZoom = document.getElementById('val-map-zoom');

    // State bindings
    let cloudSpeedVal = 1.0;
    let cloudHeightVal = 150.0;

    // Collapsible toggle
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
    });

    // Editor Mode Button Click
    modeBtn.addEventListener('click', () => {
        toggleEditorMode();
    });

    // Update UI based on Editor Mode State
    function updateEditorUI(isActive) {
        if (isActive) {
            modeBtn.innerText = 'Exit Editor [P]';
            modeBtn.classList.add('editor-btn-active');
            brushSection.style.display = 'block';
            brushSection.open = true;
            speedGroup.style.display = 'flex';
        } else {
            modeBtn.innerText = 'Enter Editor [P]';
            modeBtn.classList.remove('editor-btn-active');
            brushSection.style.display = 'none';
            speedGroup.style.display = 'none';
        }
    }

    // Brush Selection Bindings
    const selectBtns = document.querySelectorAll('.select-btn');
    selectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setBrushMode(btn.dataset.mode);
        });
    });

    // Brush Size Slider
    sliderBrushSize.addEventListener('input', () => {
        const val = parseInt(sliderBrushSize.value);
        valBrushSize.innerText = val + 'm';
        setBrushSize(val);
    });

    // Map Zoom Slider
    sliderMapZoom.addEventListener('input', () => {
        const val = parseFloat(sliderMapZoom.value);
        valMapZoom.innerText = val.toFixed(1) + 'x';
        setMinimapZoom(val);
        triggerMinimapUpdate();
    });

    // Clear Paint Map
    clearPaintBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to erase the paint map?")) {
            clearSplatGrid();
            triggerMinimapUpdate();
        }
    });

    // Fly Speed Multiplier Slider
    sliderFlySpeed.addEventListener('input', () => {
        const val = parseFloat(sliderFlySpeed.value);
        valFlySpeed.innerText = val.toFixed(1) + 'x';
        setFlySpeedMultiplier(val);
    });

    // Fog & Lighting controls
    sliderFogDensity.addEventListener('input', () => {
        const val = parseFloat(sliderFogDensity.value);
        valFogDensity.innerText = val.toFixed(4);
        if (scene.fog) scene.fog.density = val;
    });

    // Clouds controls
    sliderCloudHeight.addEventListener('input', () => {
        const val = parseFloat(sliderCloudHeight.value);
        valCloudHeight.innerText = val + 'm';
        cloudHeightVal = val;
    });

    sliderCloudSpeed.addEventListener('input', () => {
        const val = parseFloat(sliderCloudSpeed.value);
        valCloudSpeed.innerText = val.toFixed(1) + 'x';
        cloudSpeedVal = val;
    });

    // Bloom controls
    if (bloomPass) {
        sliderBloomStr.addEventListener('input', () => {
            const val = parseFloat(sliderBloomStr.value);
            valBloomStr.innerText = val.toFixed(2);
            bloomPass.strength = val;
        });
    }

    // SECTION 2: Terrain Custom Colors & Properties Listeners
    checkColorOverride.addEventListener('change', () => {
        const checked = checkColorOverride.checked;
        terrainColorUniforms.uCustomColorsEnabled.value = checked ? 1.0 : 0.0;
        customColors.enabled = checked ? 1.0 : 0.0;
        rebuildTerrain();
        triggerMinimapUpdate();
    });

    function hexToRgbColor(hex) {
        return new THREE.Color(hex);
    }

    pickerColorGrass.addEventListener('input', () => {
        const c = hexToRgbColor(pickerColorGrass.value);
        terrainColorUniforms.uGrassColor.value.copy(c);
        customColors.grass.copy(c);
        if (checkColorOverride.checked) {
            rebuildTerrain();
            triggerMinimapUpdate();
        }
    });

    pickerColorDirt.addEventListener('input', () => {
        const c = hexToRgbColor(pickerColorDirt.value);
        terrainColorUniforms.uDirtColor.value.copy(c);
        customColors.dirt.copy(c);
        if (checkColorOverride.checked) {
            rebuildTerrain();
            triggerMinimapUpdate();
        }
    });

    pickerColorSand.addEventListener('input', () => {
        const c = hexToRgbColor(pickerColorSand.value);
        terrainColorUniforms.uSandColor.value.copy(c);
        customColors.sand.copy(c);
        if (checkColorOverride.checked) {
            rebuildTerrain();
            triggerMinimapUpdate();
        }
    });

    sliderNoiseScale.addEventListener('input', () => {
        const val = parseFloat(sliderNoiseScale.value);
        valNoiseScale.innerText = val.toFixed(2) + 'x';
        customColors.noiseScale = val;
        rebuildTerrain();
        triggerMinimapUpdate();
    });

    sliderHeightMult.addEventListener('input', () => {
        const val = parseFloat(sliderHeightMult.value);
        valHeightMult.innerText = val.toFixed(2) + 'x';
        customColors.heightMultiplier = val;
        rebuildTerrain();
        triggerMinimapUpdate();
    });

    // SECTION 3: Toon Shader Settings Listeners
    checkToonTerrain.addEventListener('change', () => {
        terrainToonUniforms.uToonEnabled.value = checkToonTerrain.checked ? 1.0 : 0.0;
    });

    checkToonTrees.addEventListener('change', () => {
        treeToonUniforms.uToonEnabled.value = checkToonTrees.checked ? 1.0 : 0.0;
    });

    checkToonWater.addEventListener('change', () => {
        waterToonUniforms.uToonEnabled.value = checkToonWater.checked ? 1.0 : 0.0;
    });

    sliderToonSteps.addEventListener('input', () => {
        const val = parseFloat(sliderToonSteps.value);
        valToonSteps.innerText = val;
        terrainToonUniforms.uToonSteps.value = val;
        treeToonUniforms.uToonSteps.value = val;
        waterToonUniforms.uToonSteps.value = val;
    });

    checkOutlineEnabled.addEventListener('change', () => {
        if (summerPass && summerPass.uniforms.uOutlineEnabled) {
            summerPass.uniforms.uOutlineEnabled.value = checkOutlineEnabled.checked ? 1.0 : 0.0;
        }
    });

    sliderOutlineThick.addEventListener('input', () => {
        const val = parseFloat(sliderOutlineThick.value);
        valOutlineThick.innerText = val.toFixed(1) + 'px';
        if (summerPass && summerPass.uniforms.uOutlineThickness) {
            summerPass.uniforms.uOutlineThickness.value = val;
        }
    });

    pickerOutlineColor.addEventListener('input', () => {
        const c = hexToRgbColor(pickerOutlineColor.value);
        if (summerPass && summerPass.uniforms.uOutlineColor) {
            summerPass.uniforms.uOutlineColor.value.copy(c);
        }
    });

    sliderRimStrength.addEventListener('input', () => {
        const val = parseFloat(sliderRimStrength.value);
        valRimStrength.innerText = val.toFixed(2);
        terrainToonUniforms.uRimStrength.value = val;
        treeToonUniforms.uRimStrength.value = val;
        waterToonUniforms.uRimStrength.value = val;
    });

    pickerRimColor.addEventListener('input', () => {
        const c = hexToRgbColor(pickerRimColor.value);
        terrainToonUniforms.uRimColor.value.copy(c);
        treeToonUniforms.uRimColor.value.copy(c);
        waterToonUniforms.uRimColor.value.copy(c);
    });

    // Brush Softness Slider
    const sliderBrushSoftness = document.getElementById('slider-brush-softness');
    const valBrushSoftness = document.getElementById('val-brush-softness');
    if (sliderBrushSoftness) {
        sliderBrushSoftness.addEventListener('input', () => {
            const val = parseFloat(sliderBrushSoftness.value);
            valBrushSoftness.innerText = val.toFixed(2);
            customColors.brushSoftness = val;
        });
    }

    // Save to LocalStorage Button
    const btnSaveLocal = document.getElementById('btn-save-local');
    if (btnSaveLocal && options.saveToLocalStorage) {
        btnSaveLocal.addEventListener('click', () => {
            options.saveToLocalStorage();
        });
    }

    // Export JSON Button
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson && options.exportJSON) {
        btnExportJson.addEventListener('click', () => {
            options.exportJSON();
        });
    }

    // Import JSON Button
    const btnImportJson = document.getElementById('btn-import-json');
    const fileImportJson = document.getElementById('file-import-json');
    if (btnImportJson && fileImportJson && options.importJSON) {
        btnImportJson.addEventListener('click', () => {
            fileImportJson.click();
        });
        fileImportJson.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                options.importJSON(evt.target.result);
                syncUIColors();
            };
            reader.readAsText(file);
        });
    }

    function syncUIColors() {
        checkColorOverride.checked = customColors.enabled > 0.5;
        pickerColorGrass.value = '#' + customColors.grass.getHexString();
        pickerColorDirt.value = '#' + customColors.dirt.getHexString();
        pickerColorSand.value = '#' + customColors.sand.getHexString();
        
        sliderNoiseScale.value = customColors.noiseScale;
        valNoiseScale.innerText = customColors.noiseScale.toFixed(2) + 'x';
        sliderHeightMult.value = customColors.heightMultiplier;
        valHeightMult.innerText = customColors.heightMultiplier.toFixed(2) + 'x';
        
        if (sliderBrushSoftness) {
            sliderBrushSoftness.value = customColors.brushSoftness;
            valBrushSoftness.innerText = customColors.brushSoftness.toFixed(2);
        }
    }

    // Expose dynamic updates to the main rendering loop
    return {
        updateEditorUI,
        updateSliders: (flyMultiplier) => {
            sliderFlySpeed.value = flyMultiplier;
            valFlySpeed.innerText = flyMultiplier.toFixed(1) + 'x';
        },
        getCloudSpeed: () => cloudSpeedVal,
        getCloudHeight: () => cloudHeightVal,
        syncUIColors
    };
}
