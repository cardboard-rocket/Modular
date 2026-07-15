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
            transform: translateX(-300px);
        }
        #editor-toggle-btn {
            position: absolute;
            right: -34px;
            top: 0px;
            width: 32px;
            height: 32px;
            background: rgba(20, 20, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-left: none;
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

            <!-- SECTION 2: BRUSH SETTINGS -->
            <details id="editor-brush-section" class="editor-section" style="display:none;">
                <summary>2. Brush Settings <span>[+]</span></summary>
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
                <button id="btn-clear-paint" class="editor-btn btn-danger">Clear Paint Map</button>
            </details>

            <!-- SECTION 3: ENVIRONMENT & ATMOSPHERE -->
            <details class="editor-section" open>
                <summary>3. Environment & Atmosphere <span>[+]</span></summary>
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
