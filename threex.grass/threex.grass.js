import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export function createGrassTufts(positions, opts) {
	opts = opts || {};
	const width = opts.width !== undefined ? opts.width : 0.4;
	const height = opts.height !== undefined ? opts.height : 0.2;
	const rootColor = opts.rootColor !== undefined ? opts.rootColor : '#2c5e26';
	const tipColor = opts.tipColor !== undefined ? opts.tipColor : '#c3e669';
	const variationRootColor = opts.variationRootColor !== undefined ? opts.variationRootColor : '#1c4021';
	const variationTipColor = opts.variationTipColor !== undefined ? opts.variationTipColor : '#a5d848';
	const textureUrl = opts.textureUrl !== undefined ? opts.textureUrl : 'threex.grass/images/grass01.png';
	const colorBlend = opts.colorBlend !== undefined ? opts.colorBlend : 1.0;
	const colorNoiseScale = opts.colorNoiseScale !== undefined ? opts.colorNoiseScale : 0.05;
	const lightDir = opts.lightDir !== undefined ? opts.lightDir : new THREE.Vector3(1.0, 1.0, 1.0);
	const isFlower = opts.isFlower === true ? 1.0 : 0.0;
	const isStatic = opts.isStatic === true;

	let baseGeo;
	if (isFlower === 1.0) {
		// Crossed planes for flowers
		const plane1 = new THREE.PlaneGeometry(width, height);
		plane1.translate(0, height / 2, 0);
		const plane2 = plane1.clone();
		plane2.rotateY(Math.PI / 2);
		baseGeo = BufferGeometryUtils.mergeGeometries([plane1, plane2]);
	} else {
		// Curved blade geometry using a segmented plane
		const segments = 4; // 4 segments is a great balance of curve and performance
		baseGeo = new THREE.PlaneGeometry(width, height, 1, segments);
		baseGeo.translate(0, height / 2, 0); // Move origin to base

		const posAttribute = baseGeo.attributes.position;
		for (let i = 0; i < posAttribute.count; i++) {
			const y = posAttribute.getY(i);
			const heightFactor = y / height;
			
			// Taper width towards the top so it comes to a point, slightly softer curve
			const x = posAttribute.getX(i);
			const newX = x * (1.0 - Math.pow(heightFactor, 2.0)); // Taper curve
			posAttribute.setX(i, newX);
			
			// Bend the blade forward along the Z axis (quadratic curve)
			const curveAmount = height * 0.5; // Max bend amount
			const newZ = -Math.pow(heightFactor, 2.0) * curveAmount;
			posAttribute.setZ(i, newZ);
		}
	}
	// We need normals for lighting computation
	baseGeo.computeVertexNormals();

	// Texture
	let texture = null;
	if (textureUrl) {
		texture = new THREE.TextureLoader().load(textureUrl);
		texture.colorSpace = THREE.SRGBColorSpace;
	}

	// Custom Shader Material
	const material = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uWindSpeed: { value: 2.5 },
			uWindStrength: { value: 1.0 },
			uTexture: { value: texture },
			uRootColor: { value: new THREE.Color(rootColor) },
			uTipColor: { value: new THREE.Color(tipColor) },
			uVariationRootColor: { value: new THREE.Color(variationRootColor) },
			uVariationTipColor: { value: new THREE.Color(variationTipColor) },
			uColorBlend: { value: colorBlend },
			uColorNoiseScale: { value: colorNoiseScale },
			uLightDir: { value: lightDir.clone().normalize() },
			uIsFlower: { value: isFlower }
		},
		vertexShader: `
			${isStatic ? '#define IS_STATIC' : ''}
			uniform float uTime;
			uniform float uWindSpeed;
			uniform float uWindStrength;
			uniform float uColorNoiseScale;
			uniform vec3 uLightDir;
			
			varying vec2 vUv;
			varying vec3 vNormal;
			varying float vNoise;
			varying float vBacklight;

			// Simple 2D Hash & Noise
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
			}
			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
						   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
			}

			void main() {
				vUv = uv;

				// Instance matrix multiplication
				vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
				
				#ifndef IS_STATIC
				// Sway logic based on world position and time
				float sway = sin(uTime * uWindSpeed + worldPosition.y * 3.0 + worldPosition.x * 0.5) 
						   * cos(uTime * uWindSpeed * 0.4 + worldPosition.z * 0.6);
				
				float heightFactor = max(0.0, position.y / ${height.toFixed(5)});
				worldPosition.x += sway * 0.15 * heightFactor * uWindStrength;
				worldPosition.z += sway * 0.12 * heightFactor * uWindStrength;
				#endif
				
				// Calculate Noise per-vertex instead of per-pixel
				vNoise = noise(worldPosition.xz * uColorNoiseScale);
				
				// Blend vertex normal 85% towards straight up for soft canopy shading, then transform to world space
				vec3 blendedNormal = normalize(mix(normal, vec3(0.0, 1.0, 0.0), 0.85));
				vNormal = normalize((instanceMatrix * vec4(blendedNormal, 0.0)).xyz);

				// Calculate SSS Backlight per-vertex
				vec3 viewDir = normalize(cameraPosition - worldPosition.xyz);
				vBacklight = pow(max(0.0, dot(viewDir, -normalize(uLightDir))), 2.0);

				gl_Position = projectionMatrix * viewMatrix * worldPosition;
			}
		`,
		fragmentShader: `
			uniform sampler2D uTexture;
			uniform vec3 uRootColor;
			uniform vec3 uTipColor;
			uniform vec3 uVariationRootColor;
			uniform vec3 uVariationTipColor;
			uniform float uColorBlend;
			uniform vec3 uLightDir;
			uniform float uIsFlower;

			varying vec2 vUv;
			varying vec3 vNormal;
			varying float vNoise;
			varying float vBacklight;

			void main() {
				vec4 texColor = texture2D(uTexture, vUv);
				
				// Only discard alpha for flowers! Grass blades are solid geometry now.
				if (uIsFlower > 0.5 && texColor.a < 0.3) discard;

				// Macro-scale noise for color variations (computed in vertex shader)
				vec3 rootC = mix(uRootColor, uVariationRootColor, vNoise);
				vec3 tipC = mix(uTipColor, uVariationTipColor, vNoise);

				// 1. Grass Color Logic
				vec3 gradient = mix(rootC, tipC, vUv.y);
				vec3 grassColor = mix(texColor.rgb, gradient, uColorBlend);
				
				// 2. Flower Color Logic (Smart Petal Masking)
				float stemMask = clamp((texColor.g - max(texColor.r, texColor.b)) * 4.0, 0.0, 1.0);
				float petalMask = 1.0 - stemMask;
				float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
				// Dramatically boost flower luminance so they pop
				vec3 tintedPetal = uRootColor * (luminance * 2.5 + 0.2);
				vec3 flowerColor = mix(texColor.rgb, tintedPetal, petalMask * uColorBlend);

				// Final Base Color
				vec3 color = mix(grassColor, flowerColor, uIsFlower);

				// Fake ambient occlusion at the root (apply strictly to grass, flowers should be bright!)
				color *= mix((0.5 + 0.5 * vUv.y), 1.0, uIsFlower);

				// 3. Toon Lighting (Stepped Gradient)
				float diffuse = max(0.0, dot(vNormal, normalize(uLightDir)));
				float lightBands = smoothstep(0.4, 0.5, diffuse) * 0.4 + smoothstep(0.8, 0.9, diffuse) * 0.6;
				
				// Teal Shadow Tinting
				vec3 shadowTint = vec3(0.35, 0.55, 0.65);
				vec3 shadowColor = color * shadowTint;
				color = mix(shadowColor, color, lightBands);

				// 4. Subsurface Scattering Translucency (Backlight)
				// Isolate the top 20% of the blade for translucency effect
				float tipMask = smoothstep(0.6, 0.9, vUv.y);
				// Grass gets a green/yellow SSS tint, flowers just get pure brightened color
				vec3 sssColor = mix(color * 1.8 + vec3(0.2, 0.4, 0.1), color * 2.5, uIsFlower); 
				color = mix(color, sssColor, vBacklight * tipMask);

				gl_FragColor = vec4(color, 1.0);
			}
		`,
		side: THREE.DoubleSide,
		transparent: isFlower === 1.0,
		alphaTest: 0.3
	});

	// Create InstancedMesh
	const count = positions.length;
	const mesh = new THREE.InstancedMesh(baseGeo, material, count);
	
	const dummy = new THREE.Object3D();
	for (let i = 0; i < count; i++) {
		dummy.position.copy(positions[i]);
		dummy.rotation.y = Math.random() * Math.PI * 2; // Random rotation per instance in full 360
		
		// Add slight scale variation
		const scale = 0.8 + Math.random() * 0.4;
		dummy.scale.set(scale, scale, scale);
		
		dummy.updateMatrix();
		mesh.setMatrixAt(i, dummy.matrix);
	}
	mesh.instanceMatrix.needsUpdate = true;

	return mesh;
}
