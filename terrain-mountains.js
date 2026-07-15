import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorMountainGrass = new THREE.Color(0x4b7043); // Dark alpine green
const colorMountainRock = new THREE.Color(0x5a5e6b);  // Slate grey rock
const colorSnow = new THREE.Color(0xf5f6fa);          // Crisp snow white

export default {
    name: "🏔️ Misty Mountains",
    shoreName: "░ Mountain Shore",
    getHeight(x, z, snoise) {
        // Jagged mountain ridges
        const n1 = snoise(x * 0.001, z * 0.001);
        const n2 = snoise(x * 0.004, z * 0.004);
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge;
        const h = ridge * 160.0 + n2 * 20.0 + 8.0;
        return Math.max(6.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 15.0) {
            tempColor.lerpColors(colorSand, colorMountainGrass, smoothstep(4.2, 15.0, h));
        } else if (h < 55.0) {
            tempColor.lerpColors(colorMountainGrass, colorMountainRock, smoothstep(15.0, 55.0, h));
        } else {
            tempColor.lerpColors(colorMountainRock, colorSnow, smoothstep(55.0, 110.0, h));
        }
    }
};
