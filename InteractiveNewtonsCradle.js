//----------------------------------//
//----Newtons Cradle Application----//
//----------------------------------//

//------------------------//
//----Global Variables----//
//------------------------//
var camera, scene, renderer, controls;
var mirrorSpheres = new Array();
var mirrorBeams = new Array();
var sphereSelected = null;
var initialMouseCoordinates;

//----Ball Values----//
var numberOfSpheres = 5;
var distanceBetweenSpheres = 101;
var sphereFriction = .4;
var sphereRestitution = .93;

//----Point to Location of Physijs Files----//
Physijs.scripts.worker = './libraries/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

//-------------------------//
//----Setup Initializer----//
//-------------------------//
function init() {
	//----Set Everything to Null----//
	for (var i = 0; i < NewtonsCradleDiv.children.length; i++) {
		NewtonsCradleDiv.removeChild(NewtonsCradleDiv.children[i]);
	}
	scene = null;
	renderer = null;
	camera = null;
	var sphereSelected = null;
	var mirrorSpheres = new Array();
	var mirrorBeams = new Array();

	//----Create Scene----//
	scene = new Physijs.Scene;
	scene.setGravity(new THREE.Vector3(0, -3000, 0));
	
	//----Create Camera----//
 	camera = new THREE.PerspectiveCamera(35, (window.innerWidth/window.innerHeight), 1, 20000);
	camera.position.set(0, 0, 600+(numberOfSpheres*150));
	scene.add(camera);
 	
 	//----Create Renderer----//
 	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	NewtonsCradleDiv.appendChild( renderer.domElement );
	
	//----Add Lighting----//
	var light = new THREE.PointLight(0xffffff);
	light.position.set(0, 0, 0);
	scene.add(light);
	
	//----Add Controls----//
	controls = new THREE.TrackballControls(camera);	
	controls.zoomSpeed = .1;
		
	//----Generate Environment and Newtons Cradle----//
	var size = 5000;
	var images = new Array('images/dawnmountain-xpos.png', 'images/dawnmountain-xneg.png', 'images/dawnmountain-ypos.png', 'images/dawnmountain-yneg.png', 'images/dawnmountain-zpos.png', 'images/dawnmountain-zneg.png');
 	scene.add(create3DEnvironment(size, images));
 	createNewtonsCradle();
 	
 	//----Add Events----//
 	projector = new THREE.Projector();
 	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
 	document.addEventListener( 'mousemove', onMouseMove, false );
 	document.addEventListener( 'mouseup', onMouseUp, false );
	window.addEventListener( 'resize', onWindowResize, false );
 	
 	//----Add Animation----//
 	requestAnimationFrame(animate);
}

//----------------------------------------//
//----Create 3D Background Environment----//
//----------------------------------------//
function create3DEnvironment(size, images) {
	//----Create Background----//	
	var materialArray = [];
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[0]) }));
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[1]) }));
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[2]) }));
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[3]) }));
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[4]) }));
	materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(images[5]) }));
	for (var i = 0; i < 6; i++)
	   materialArray[i].side = THREE.BackSide;
	var skybox = new THREE.Mesh(new THREE.CubeGeometry( size, size, size, 1, 1, 1), new THREE.MeshFaceMaterial( materialArray ));
	return skybox;
}

//----------------------------//
//----Create Cradle Object----//
//----------------------------//
function createNewtonsCradle() {
	//----Camera to Create Reflection----//
	mirrorSphereCamera = new THREE.CubeCamera( 0.1, 5000, 512 );
	mirrorSphereCamera.position.set(0, -100, 0);
	scene.add(mirrorSphereCamera);
	
	//----Create Spheres----//
	var sphereSize = 50;
	var centerSpherePosition = 0;
	var sphereYPosition = -100;
	for (var i = 0; i < numberOfSpheres; i++) {
		createSphere(sphereSize, centerSpherePosition+((i-((numberOfSpheres-1)/2))*distanceBetweenSpheres
		), sphereYPosition, i);
	}
	//----Add Contraints to Put Spheres on Hinges----//
	for (var i = 0; i < mirrorSpheres.length; i++) {
		var constraint = new Physijs.HingeConstraint(
			mirrorSpheres[i],
			new THREE.Vector3(mirrorSpheres[i].position.x, mirrorSpheres[i].position.y+290, 0), // point in the scene to apply the constraint
			new THREE.Vector3(0, 0, 1) // Axis along which the hinge lies 
		);
		scene.addConstraint(constraint);
		constraint.setLimits(
    		-Math.PI, // minimum angle of motion, in radians
    		Math.PI, // maximum angle of motion, in radians
    		.5, // applied as a factor to constraint error
    		0 // controls bounce at limit (0.0 == no bounce)
		);
	}
	
	//----Create Structure Beams----//
	var structureSpecifications = new Array(10, 400, -((numberOfSpheres*50)+50), 0, -100, 10, 400, -((numberOfSpheres*50)+50), 0, 100, 10, 400, ((numberOfSpheres*50)+50), 0, -100, 10, 400, ((numberOfSpheres*50)+50), 0, 100, 10, (numberOfSpheres*100)+110, 0, 190, -100, 10, (numberOfSpheres*100)+110, 0, 190, 100);
	for (var i = 0, j = 0; i < (structureSpecifications.length/5); i++) {
		mirrorBeams[i] = makeBeam(structureSpecifications[j++], structureSpecifications[j++]);
		mirrorBeams[i].position.set(structureSpecifications[j++], structureSpecifications[j++], structureSpecifications[j++]);
		if ((i) >= 4) 
			mirrorBeams[i].rotation.z = Math.PI/2;
		scene.add(mirrorBeams[i]);
	}
}

//---------------------------------//
//----Creates Reflective Sphere----//
//---------------------------------//
function createSphere(size, xPosition, yPosition, number) {
	//----Create Mirrored Spheres----//
	//var randomColor = '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
	var mirrorSphere = new Physijs.SphereMesh(new THREE.SphereGeometry( 50, 32, 16 ), Physijs.createMaterial(new THREE.MeshBasicMaterial({ envMap: mirrorSphereCamera.renderTarget }), sphereFriction, sphereRestitution), 5000);
	mirrorSphere.position.set(xPosition, yPosition, 0);
	
	//----Create Hinge Strings----//
	frontBeam = makeBeam(2, 310);
	frontBeam.position.set(0, 140, 42);
	frontBeam.rotation.x = Math.PI/7.5;
	frontBeam.material.color.setHex('#CCCCCC');
	backBeam = makeBeam(2, 310);
	backBeam.position.set(0, 140, -42);
	backBeam.rotation.x = -Math.PI/7.5;
	backBeam.material.color.setHex('#CCCCCC');
	mirrorSphere.add(frontBeam);
	mirrorSphere.add(backBeam);
	
	//----Add Collision Recognizer----//
	mirrorSphere.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation ) {
		//this.material.color.setHex(Math.random() * 0xffffff); // Changes sphere color on impact
	});
		
	//----Add Sphere Objects to the Scene----//	
	mirrorSpheres[number] = mirrorSphere;
	scene.add(mirrorSpheres[number]);
}

//----------------------------//
//----Creates Beams Sphere----//
//----------------------------//
function makeBeam(radius, length) {
	var beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length), new THREE.MeshBasicMaterial({envMap:mirrorSphereCamera.renderTarget}));
	return beam;
}

//-----------------//
//----Animation----//
//-----------------//
function animate() 
{	

	//----Update Controls----//
	controls.update();
	
	//----Reload Reflective Sphere Image----//
	mirrorSphereCamera.position.set(mirrorSpheres[0].position.x, mirrorSpheres[0].position.y, mirrorSpheres[0].position.z);
	mirrorSphereCamera.updateCubeMap( renderer, scene );
	
	//----Render Physics and Scene----//
	scene.simulate();
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

//------------------------//
//----On Window Resize----//
//------------------------//
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

//--------------------//
//----Mouse Events----//
//--------------------//
function onDocumentMouseDown(event) {
	event.preventDefault();
	var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
	projector.unprojectVector( vector, camera );
	var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
	var intersects = raycaster.intersectObjects( mirrorSpheres );

	if ( intersects.length > 0 ) {
		controls.enabled = false;
		initialMouseCoordinates = new Array(event.clientX, event.clientY);
		sphereSelected = intersects[0].object;
	}
}

function onMouseMove(event) {
	if (sphereSelected != null) {
		sphereSelected.setLinearVelocity(new THREE.Vector3((event.clientX-initialMouseCoordinates[0]), (event.clientY-initialMouseCoordinates[1]), sphereSelected.position.z));
	}
}

function onMouseUp(event) {
	sphereSelected = null;
	controls.enabled = true;
}