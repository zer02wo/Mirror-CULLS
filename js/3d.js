var {PythonShell} = require('python-shell');
//three.js WebGL library
var THREE = require('three');

//Global three.js variables
var camera, scene, mesh, renderer;
var xRotateFactor = 0.0;
var yRotateFactor = 0.0;
var zRotateFactor = 0.0;

function init() {
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and scene to render
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);

  //Create PerspectiveCamera with 90 FOV, aspect matching the window, with near and far frustum planes
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 10);
  //Set camera position in 3D space
  camera.position.z = 1.1;
  //Create scene for 3D space
  scene = new THREE.Scene();

  //Define geometry for cube with equal height, width and depth
  var geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  //Define material for mesh
  var material = new THREE.MeshNormalMaterial();
  //Create mesh from geometry and material
  mesh = new THREE.Mesh(geometry, material);
  //Add mesh to scene
  scene.add(mesh);
  //Set renderer to WebGL with antialiasing
  renderer = new THREE.WebGLRenderer({antialias: true});
  //Fill renderer to window and place within UI
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('style').appendChild(renderer.domElement);
  //Animate the mesh within the scene
  animate();
}

//Animate mesh in scene with simple physics mimicking a very basic implementation of momentum/forces
function animate() {
  //Create efficient animation loop to draw the scene at each screen refresh interval (i.e. 60Hz)
  requestAnimationFrame(animate);

  //Set rotation in x-axis and describe its physics
  mesh.rotation.x += xRotateFactor;
  xRotateFactor = describeSimplePhysics(xRotateFactor);
  //Set rotation in y-axis and describe its physics
  mesh.rotation.y += yRotateFactor;
  yRotateFactor = describeSimplePhysics(yRotateFactor);
  //Set rotation in z-axis and describe its physics
  mesh.rotation.z += zRotateFactor;
  zRotateFactor = describeSimplePhysics(zRotateFactor);

  //Render the scene
  renderer.render(scene, camera);
}

//Define simplistic representation of air resistance/friction slow-down and momentum conservation
function describeSimplePhysics(axisRotFac) {
  //Define rotation speed in positive direction
  if(axisRotFac > 0.05) {
    axisRotFac -= 0.0005;
  } else if(axisRotFac > 0.025) {
    axisRotFac -= 0.00025;
  } else if(axisRotFac > 0.01) {
    axisRotFac -= 0.0001;
  } else if(axisRotFac > 0.0005) {
    axisRotFac = 0.0;
  }
  //Define rotation speed in negative direction
  if(axisRotFac < -0.05) {
    axisRotFac += 0.0005;
  } else if(axisRotFac < -0.025) {
    axisRotFac += 0.00025;
  } else if(axisRotFac < -0.01) {
    axisRotFac += 0.0001;
  } else if(axisRotFac < -0.0005) {
    axisRotFac = 0.0;
  }
  //Return updated rotation factor
  return axisRotFac;
}

//Display gesture within UI
function displayGesture(gesture) {
  //Get gesture div
  let gesDiv = document.getElementById('gesture');
  //Show gesture message in div
  gesDiv.classList.add('transition');
  gesDiv.innerHTML = gesture;
  //Transition-out after 5 seconds
  setTimeout(function() {gesDiv.classList.remove('transition');}, 2000);
}

//Use output from gesture sensor python script as control
let pyshell = new PythonShell('py/gesture_print.py');
pyshell.on('message', function(gesture) {
  displayGesture(gesture);
  switch(gesture) {
    case "Up":
      //Rotate in negative x-axis
      xRotateFactor = -0.1;
      break;
    case "Down":
      //Rotate in positive x-axis
      xRotateFactor = 0.1;
      break;
    case "Left":
      //Rotate in negative y-axis
      yRotateFactor = -0.1;
      break;
    case "Right":
      //Rotate in positive y-axis
      yRotateFactor = 0.1;
      break;
    case "Clockwise":
      //Rotate in negative z-axis
      zRotateFactor = -0.1;
      break;
    case "Anti-clockwise":
      //Rotate in positive z-axis
      zRotateFactor = 0.1;
      break;
    case "Forward":
      //Set mesh back to default position and stop rotation in all axes
      mesh.rotation.x = 0.0;
      xRotateFactor = 0.0;
      mesh.rotation.y = 0.0;
      yRotateFactor = 0.0;
      mesh.rotation.z = 0.0;
      zRotateFactor = 0.0;
      break;
    case "Backward":
      //Set mesh back to default position and stop rotation in all axes
      mesh.rotation.x = 0.0;
      xRotateFactor = 0.0;
      mesh.rotation.y = 0.0;
      yRotateFactor = 0.0;
      mesh.rotation.z = 0.0;
      zRotateFactor = 0.0;
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
