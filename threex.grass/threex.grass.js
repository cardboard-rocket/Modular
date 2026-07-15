import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export function createGrassTufts(positions, opts) {
	opts = opts || {};
	var width = opts.width !== undefined ? opts.width : 0.4;
	var height = opts.height !== undefined ? opts.height : 0.2;
	var color = opts.color !== undefined ? opts.color : 'grey';
	var emissive = opts.emissive !== undefined ? opts.emissive : 'darkgreen';
	var textureUrl = opts.textureUrl !== undefined ? opts.textureUrl : 'threex.grass/images/grass01.png';

	// create the initial geometry
	var geometry = new THREE.PlaneGeometry(width, height);
	geometry.translate(0, height / 2, 0);

	// Tweak the normal for better lighting
	var normalAttr = geometry.attributes.normal;
	if (normalAttr) {
		for (var i = 0; i < normalAttr.count; i++) {
			normalAttr.setXYZ(i, 0.0, 1.0, 0.0);
		}
		normalAttr.needsUpdate = true;
	}
	
	// create each tuft and merge their geometry for performance
	var geometries = [];
	for (var i = 0; i < positions.length; i++) {
		var position = positions[i];
		var baseAngle = Math.PI * 2 * Math.random();

		var nPlanes = 2;
		for (var j = 0; j < nPlanes; j++) {
			var angle = baseAngle + j * Math.PI / nPlanes;

			// First plane
			var g1 = geometry.clone();
			g1.rotateY(angle);
			g1.translate(position.x, position.y, position.z);
			geometries.push(g1);

			// The other side of the plane
			var g2 = geometry.clone();
			g2.rotateY(angle + Math.PI);
			g2.translate(position.x, position.y, position.z);
			geometries.push(g2);
		}
	}

	var mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
	geometry.dispose(); // clean up initial template geometry
	
	// load the texture
	var texture = null;
	if (textureUrl) {
		texture = new THREE.TextureLoader().load(textureUrl);
		texture.colorSpace = THREE.SRGBColorSpace;
	}
	
	// build the material
	var material = new THREE.MeshPhongMaterial({
		map: texture,
		color: new THREE.Color(color),
		emissive: new THREE.Color(emissive),
		alphaTest: 0.7,
		transparent: true
	});
	
	// create the mesh
	var mesh = new THREE.Mesh(mergedGeo, material);
	return mesh;
}

