import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorPlainsGrass = new THREE.Color(0xaed581); // Bright yellow-green grass
const colorPlainsHigh = new THREE.Color(0xdce775);  // Pastoral light green/wheat highlight
const colorPlainsRock = new THREE.Color(0x8d6e63);  // Warm clay rock
const colorDirt = new THREE.Color(0xdcb58a);

export default {
    name: "🌾 Golden Plains",
    shoreName: "░ Plain Shore",
    getHeight(x, z, snoise) {
        // Flat, rolling hills
        const n1 = snoise(x * 0.001, z * 0.001);
        const n2 = snoise(x * 0.005, z * 0.005);
        const h = n1 * 8.0 + n2 * 2.0 + 9.0;
        return Math.max(6.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorSand, colorPlainsGrass, smoothstep(4.2, 6.2, h));
        } else if (h < 25) {
            tempColor.lerpColors(colorPlainsGrass, colorPlainsHigh, smoothstep(6.2, 25, h));
        } else if (h < 38) {
            tempColor.lerpColors(colorPlainsHigh, colorPlainsRock, smoothstep(25, 38, h));
        } else {
            tempColor.lerpColors(colorPlainsRock, colorDirt, smoothstep(38, 55, h));
        }
    }
};
