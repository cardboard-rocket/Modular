/**
 * editor-env.js - Developer Environmental & Post-Processing Controller
 * Contains Raycast Splat Painter, atmosphere/fog fine-tuning, cloud variables, and bloom controllers.
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
        setFlySpeedMultiplier
    } = options;

    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #editor-panel {
            position: fixed;
            left: 16px;
            top: 16px;
            bottom: 16px;
            width: 320px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #f1f5f9;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(12px);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #editor-panel.collapsed {
            transform: translateX(-340px);
        }
        #editor-toggle-btn {
            position: absolute;
            right: -52px;
            top: 12px;
            width: 40px;
            height: 40px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #f1f5f9;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 4px 0 15px rgba(0, 0, 0, 0.25);
            backdrop-filter: blur(12px);
        }
        .editor-header {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: bold;
            font-size: 14px;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .editor-body {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .editor-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .section-title {
            font-weight: bold;
            color: #ffd166;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
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
        }
        .editor-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            text-align: center;
        }
        .editor-btn:hover {
            background: #1d4ed8;
        }
        .editor-btn-active {
            background: #10b981 !important;
        }
        .btn-danger {
            background: #ef4444 !important;
        }
        .btn-danger:hover {
            background: #dc2626 !important;
        }
        .select-group {
            display: flex;
            gap: 6px;
        }
        .select-btn {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            text-align: center;
            font-size: 11px;
        }
        .select-btn.active {
            background: #38bdf8;
            color: #0f172a;
            border-color: #38bdf8;
            font-weight: bold;
        }
        /* Custom scrollbar */
        .editor-body::-webkit-scrollbar {
            width: 6px;
        }
        .editor-body::-webkit-scrollbar-track {
            background: transparent;
        }
        .editor-body::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);

    // Create Panel DOM
    const panel = document.createElement('div');
    panel.id = 'editor-panel';
    panel.className = 'collapsed'; // Collapsed by default
    panel.innerHTML = `
        <button id="editor-toggle-btn" title="Toggle Developer Panel">🛠️</button>
        <div class="editor-header">🛠️ Developer Terrain Editor</div>
        <div class="editor-body">
            
            <!-- SECTION 1: EDITOR STATE -->
            <div class="editor-section">
                <div class="section-title">Editor Mode</div>
                <button id="editor-mode-btn" class="editor-btn">Enter Editor Mode (P)</button>
                <div id="editor-speed-group" class="control-group" style="display:none;">
                    <div class="control-label">Fly Speed Multiplier: <span id="val-fly-speed">1.0x</span></div>
                    <input type="range" id="slider-fly-speed" class="editor-slider" min="0.1" max="10" step="0.1" value="1.0">
                </div>
            </div>

            <!-- SECTION 2: BRUSH SETTINGS -->
            <div id="editor-brush-section" class="editor-section" style="display:none;">
                <div class="section-title">Raycast Splat Painter</div>
                <div class="control-group">
                    <div class="control-label">Brush Mode</div>
                    <div class="select-group">
                        <button class="select-btn active" data-mode="rotate">Rotate</button>
                        <button class="select-btn" data-mode="write">Paint density</button>
                        <button class="select-btn" data-mode="erase">Block spawn</button>
                    </div>
                </div>
                <div class="control-group">
                    <div class="control-label">Brush Size: <span id="val-brush-size">40m</span></div>
                    <input type="range" id="slider-brush-size" class="editor-slider" min="10" max="150" value="40">
                </div>
                <button id="btn-clear-paint" class="editor-btn btn-danger">Clear Paint Map</button>
            </div>

            <!-- SECTION 3: FOG & LIGHTS -->
            <div class="editor-section">
                <div class="section-title">Fog & Lights</div>
                <div class="control-group">
                    <div class="control-label">Fog Density: <span id="val-fog-density">0.0005</span></div>
                    <input type="range" id="slider-fog-density" class="editor-slider" min="0" max="0.005" step="0.0001" value="0.0005">
                </div>
                <div class="control-group">
                    <div class="control-label">Fog Color:</div>
                    <input type="color" id="picker-fog-color" style="width:100%; border:none; height:28px; border-radius:4px; cursor:pointer;" value="#8cbce6">
                </div>
                <div class="control-group">
                    <div class="control-label">Ambient Intensity: <span id="val-ambient">0.4</span></div>
                    <input type="range" id="slider-ambient" class="editor-slider" min="0" max="2" step="0.05" value="0.4">
                </div>
                <div class="control-group">
                    <div class="control-label">Sun Intensity: <span id="val-sun">1.4</span></div>
                    <input type="range" id="slider-sun" class="editor-slider" min="0" max="4" step="0.1" value="1.4">
                </div>
            </div>

            <!-- SECTION 4: CLOUDS -->
            <div class="editor-section">
                <div class="section-title">Clouds</div>
                <div class="control-group">
                    <div class="control-label">Cloud Height: <span id="val-cloud-height">150m</span></div>
                    <input type="range" id="slider-cloud-height" class="editor-slider" min="50" max="800" step="10" value="150">
                </div>
                <div class="control-group">
                    <div class="control-label">Cloud Speed: <span id="val-cloud-speed">1.0x</span></div>
                    <input type="range" id="slider-cloud-speed" class="editor-slider" min="0" max="5" step="0.1" value="1.0">
                </div>
            </div>

            <!-- SECTION 5: BLOOM -->
            <div class="editor-section">
                <div class="section-title">Bloom</div>
                <div class="control-group">
                    <div class="control-label">Bloom Strength: <span id="val-bloom-str">0.15</span></div>
                    <input type="range" id="slider-bloom-str" class="editor-slider" min="0" max="2" step="0.02" value="0.15">
                </div>
                <div class="control-group">
                    <div class="control-label">Bloom Radius: <span id="val-bloom-rad">0.6</span></div>
                    <input type="range" id="slider-bloom-rad" class="editor-slider" min="0" max="2" step="0.05" value="0.6">
                </div>
                <div class="control-group">
                    <div class="control-label">Bloom Threshold: <span id="val-bloom-th">0.9</span></div>
                    <input type="range" id="slider-bloom-th" class="editor-slider" min="0" max="1" step="0.05" value="0.9">
                </div>
            </div>

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
    const sliderBrushSize = document.getElementById('slider-slider-brush-size') || document.getElementById('slider-brush-size');
    const valBrushSize = document.getElementById('val-brush-size');
    const clearPaintBtn = document.getElementById('btn-clear-paint');

    const sliderFogDensity = document.getElementById('slider-fog-density');
    const valFogDensity = document.getElementById('val-fog-density');
    const pickerFogColor = document.getElementById('picker-fog-color');
    const sliderAmbient = document.getElementById('slider-ambient');
    const valAmbient = document.getElementById('val-ambient');
    const sliderSun = document.getElementById('slider-sun');
    const valSun = document.getElementById('val-sun');

    const sliderCloudHeight = document.getElementById('slider-cloud-height');
    const valCloudHeight = document.getElementById('val-cloud-height');
    const sliderCloudSpeed = document.getElementById('slider-cloud-speed');
    const valCloudSpeed = document.getElementById('val-cloud-speed');

    const sliderBloomStr = document.getElementById('slider-bloom-str');
    const valBloomStr = document.getElementById('val-bloom-str');
    const sliderBloomRad = document.getElementById('slider-bloom-rad');
    const valBloomRad = document.getElementById('val-bloom-rad');
    const sliderBloomTh = document.getElementById('slider-bloom-th');
    const valBloomTh = document.getElementById('val-bloom-th');

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
            modeBtn.innerText = 'Exit Editor Mode (P)';
            modeBtn.classList.add('editor-btn-active');
            brushSection.style.display = 'flex';
            speedGroup.style.display = 'flex';
        } else {
            modeBtn.innerText = 'Enter Editor Mode (P)';
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

    // Clear Paint Map
    clearPaintBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to erase the paint map?")) {
            clearSplatGrid();
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

    pickerFogColor.addEventListener('input', () => {
        const val = pickerFogColor.value;
        const color = new THREE.Color(val);
        scene.background = color;
        if (scene.fog) scene.fog.color = color;
    });

    sliderAmbient.addEventListener('input', () => {
        const val = parseFloat(sliderAmbient.value);
        valAmbient.innerText = val.toFixed(2);
        ambientLight.intensity = val;
    });

    sliderSun.addEventListener('input', () => {
        const val = parseFloat(sliderSun.value);
        valSun.innerText = val.toFixed(1);
        dirLight.intensity = val;
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

        sliderBloomRad.addEventListener('input', () => {
            const val = parseFloat(sliderBloomRad.value);
            valBloomRad.innerText = val.toFixed(2);
            bloomPass.radius = val;
        });

        sliderBloomTh.addEventListener('input', () => {
            const val = parseFloat(sliderBloomTh.value);
            valBloomTh.innerText = val.toFixed(2);
            bloomPass.threshold = val;
        });
    }

    // Expose dynamic updates to the main rendering loop
    return {
        updateEditorUI,
        updateSliders: (flyMultiplier) => {
            sliderFlySpeed.value = flyMultiplier;
            valFlySpeed.innerText = flyMultiplier.toFixed(1) + 'x';
        },
        getCloudSpeed: () => cloudSpeedVal,
        getCloudHeight: () => cloudHeightVal
    };
}
