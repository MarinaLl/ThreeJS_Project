// REQUIRED imports
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

// Variables
var camera, scene, renderer, controls;
let currentModel = null;
let plane = null;
// Start
function init() {
  // Creates new Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color("White"); // Customize background color as preference

  // Creates new Camera [PerspectiveCamera(fov, aspect, near, far)]
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Customize as preference
  camera.position.z = 5; // How far the camera is from the object
  
  // Creates new Render
  renderer = new THREE.WebGLRenderer();
  // Set render size
  renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8); // Customize as preference
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Shadow type 
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Shadow effect
  renderer.toneMappingExposure = 1; // Shadow exposure
  // Where the rendered model is going to be
  document.getElementById('canvas-container').appendChild(renderer.domElement); // Change 'canvas-container' for the html element id you want to show your model 
  /* Note: make sure you change css for applaying the same styles to the new object */
  
  // Adding controls to the objects
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; // Disabled moving the object with right click
  controls.enableDamping = true; // Enables damping (inertia) when rotate objects
  controls.dampingFactor = 0.05; // Inertia the object is going to have [customize as preference][Update controls if want this feature]
  controls.minPolarAngle = 1; // Unable to rotate the model vertically
  controls.maxPolarAngle = 1; // Unable to rotate the model vertically
  controls.minDistance = 1; // Minimum distance you can zoom in
  controls.maxDistance = 4; // minimum distance you can zoom out
  controls.update(); // Update the controls after changes [Required]
  
  // Adding environment on the scene to see the rendered model
  const environment = new RoomEnvironment(); // Create new environment
  const pmremGenerator = new THREE.PMREMGenerator( renderer ); // Adds the environment on the scene
  scene.environment = pmremGenerator.fromScene( environment ).texture; // Adds the textures that the environment creates on the scene
  pmremGenerator.dispose(); // Optimize the render

  /* Uncomment if want axes in models for tracking position */
  /*
  // Adding axes for model position [XYZ]
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // Custom color axes
  const colorRed = new THREE.Color(0xFF0000);
  const colorBlue = new THREE.Color(0x0000FF);
  const colorGreen = new THREE.Color(0x00FF00);
  // Setting the colors
  axesHelper.setColors(colorRed, colorBlue, colorGreen );*/

  // Adding ambient lights on the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Create Abient Lights
  scene.add(ambientLight); // Add to the scene
 
  // Adding directional light
   const directionalLight = new THREE.DirectionalLight(0xffffff, 2); // Create Directional Light
   directionalLight.position.set(5, 10, 7); // Set position where the light is coming from
   directionalLight.castShadow = true; // Enable make shadow
   directionalLight.shadow.mapSize.width = 1024; // Shadow size
   directionalLight.shadow.mapSize.height = 1024; // Shadow size
   directionalLight.shadow.camera.top = 10; // Shadow camera top position
   directionalLight.shadow.camera.bottom = -10; // Shadow camera bottom position
   directionalLight.shadow.camera.left = -10; // Shadow camera left position
   directionalLight.shadow.camera.right = 10; // Shadow camera right position
   scene.add(directionalLight); // Adding the directional lights on the scene

   //console.log('postion: ', camera.position);
}

// Loads new models into scene
function loadModel(url){
  // Manage loading stages for showing a loading screen
  const manager = new THREE.LoadingManager(); // Creates a new loading manager
  const loadingScene = document.getElementById('loader'); // Getting from the dom the element where the loading icon is from
  // Will cast when the model is on loading process
  manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    loadingScene.style.display = 'block'; // Display the loading screen
  };
  // Will cast whem the model is completly loaded
  manager.onLoad = function ( ) {
    console.log( 'Loading complete!');
    loadingScene.style.display = 'none'; // Set display none for removing the loading screen
  };

  // Start loading models
  const loader = new GLTFLoader(manager); // Creates the loader [GLTFLoader() for .gltf 3D model format]
  loader.load(url, function (gltf) { // url == model file path
    currentModel = gltf.scene; // Model loaded
    // Adds shadows to all descendants
    currentModel.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true; // Enable the model to cast shadows
        child.receiveShadow = true; // Enable the model to receive shadows
      }
    });
    // Change camera position
    camera.position.x = 0;
    camera.position.y = 1;
    camera.position.z = 3;
    // Change model Y rotation
    currentModel.rotateY(0.785398); 
    // Add the model into the scene
    scene.add(currentModel);

    // Creates the floor, so the main model can show floor shadows
    const geometry = new THREE.PlaneGeometry(10000, 10000); // Generates the geometry
    const material = new THREE.MeshStandardMaterial({ color: scene.background, side: THREE.DoubleSide }); // Set floor color and DoubleSide (lets the object render the two sides, frond and back)
    plane = new THREE.Mesh(geometry, material); // Creates the floor with all properties
    plane.rotateX(-Math.PI / 2); // Change position by rotateing X axe
    plane.castShadow = false; // Disable the floor to cast shadows
    plane.receiveShadow = true; // Enable the floor to recive shadows
    scene.add(plane); // Add the floor into the scene

    // Create a boundingBox for tracking the full position of the model
    const boundingBox = new THREE.Box3().setFromObject(gltf.scene); // .setFromObject([your_object])
	  const size = boundingBox.getSize(new THREE.Vector3()); // Get the sizes of the objects
    /* Stick the floor to the object */
    // Set the Y position of the floor as the minimum position of the current object
    plane.position.y = boundingBox.min.y - 0.001; // Floor Y position = currentModel minimum Y - 0.001 
    
    /* Usefull console log message of object info */
    //console.log("Model position:", currentModel.position);
	  //console.log("Model size:", size);
    //console.log("Minimum position:", boundingBox.min.y);
    camera.lookAt(currentModel); // Change camera view position
    
  },undefined, function (error){ // Exception if an error ocurrs
    console.error(error); // Show the message on console
    alert(error); // Show a visual message (on page) with the error
  });
}

// Animate and render the scene
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update the controls
  renderer.render(scene, camera); // Renders the complete scene
}

var animation;
// Makeing the animation for rotating the model with the controls
function rotateAnimation(){
  animation = requestAnimationFrame(rotateAnimation); // Request the animation
  currentModel.rotation.y += 0.01; // Rotate the model on the Y axe
  controls.update(); // Update the controls
  renderer.render(scene, camera); // Render the scene
}

// Select all the images with class ['.model-preview']
const imgElements = document.querySelectorAll('.model-preview'); // Change querySelectorAll('your_html_[tag/.class/#id]')

// Creates the file names for loading models
function createFileName(elementID){
  const folder = "public/3Dmodels/"; // Folder path where the models are
  const imageID = elementID; // Get the ID of the image
  const fullFileName = folder + imageID + ".gltf"; // Creates the full name of the file by adding the extension for loading 3D models [.gltf]
  // Calls for loading the model
  loadModel(fullFileName);
}

// Select the window popUp
const windowPopUp = document.getElementById('popup');

// loops all the images for displaying the right model
imgElements.forEach(function(element){
  // Listents for clicks on the images
  element.addEventListener('click', function (event) {
    windowPopUp.style.display = 'block'; // Change display to block for showing the popUp
    // Check if the object clicked is the same as one of the images
    if (element.id == event.target.id) { // Compares the IDs
      console.log(element.id);
      // Call function for generating the model file name [createFileName(your_html_img_id)]
      createFileName(element.id);
    }
  });
});

// Event listener for clicking outside the popUp
windowPopUp.addEventListener('click', function(event){
  // If click outside the popUp window, it will disappear
  if (event.target.id === "popup") {
      windowPopUp.style.display = 'none'; // Change display to none for hidding the popUp window
      scene.remove(currentModel); // Removes the current model on the scene
      scene.remove(plane); // Removes the floor
      cancelAnimationFrame(animation); // Cancel animation
      currentlyPlaying = false; // Reset the rotation status for not looping the rotate animation
      playBtn.style.color = '#000000'; // Reset the play button color
  }
});

// Select the close button
const closebtn = document.getElementById('close-btn');

closebtn.addEventListener('click', function(event){
  windowPopUp.style.display = 'none'; // Change display to none for hidding the popUp window
  scene.remove(currentModel); // Removes the current model on the scene
  scene.remove(plane); // Removes the floor
  cancelAnimationFrame(animation); // Cancel animation
  currentlyPlaying = false; // Reset the rotation status for not looping the rotate animation
  playBtn.style.color = '#000000'; // Reset the play button color
});
// Rotates the model to left with the canvas icons
function rotateLeft(){
  currentModel.rotation.y -= 0.3; // Move the object to left
}
// Rotates the model to right with the canvas icons
function rotateRight(){
  currentModel.rotation.y += 0.3; // Move the object to right
}

// Manual Zoom on a 3d Environment, this functions modify the camera position mathematically for achieving the zoom result.
const distanceY = 0.0899255742939094; // Distance the camera will travel in Y axis
function zoom(){
  let distanceXZ = Math.hypot(camera.position.z, camera.position.x); // Calculates the hypotenuse of the x, z triangle (rotation angles)
  let deg = Math.atan2(camera.position.z, camera.position.x); // Calculates the degree of the x, z triangle
  let sin = Math.sin(deg); // Get the sin
  let cos = Math.cos(deg); // Get the cos
  camera.position.z = sin * distanceXZ; // Set the camera Z position, multiplying the sinus and the hypotenuse
  camera.position.x = cos * distanceXZ; // Set the camera X position, multiplying the cosinus and the hypotenuse
  //console.log("Degree: ", deg); // Shows the degree of the triangle
  camera.updateProjectionMatrix(); // Required after doing changes
}

// Bottom center controls
const iconBtns = document.querySelectorAll('.icon-controls'); // Select all controls in the canvas
const playBtn = document.getElementById('play-icon'); // Select the play icon in controls

var currentlyPlaying = false; // Set the if there is default rotation
// Creating an event listener for each button
iconBtns.forEach(function(element){ 
  element.addEventListener('click', function(){
    switch (element.title) {
      case 'Rotate left':
        rotateLeft();
        break;
      case 'Rotate right':
        rotateRight();
        break;
      case 'Zoom in':
        camera.position.y -= distanceY;
        zoom();
        break;
      case 'Zoom out':
        camera.position.y += distanceY;
        zoom();
        break;
      case 'Play':
        if(!currentlyPlaying){
          rotateAnimation();
        }
        playBtn.style.color = '#3b5e9c';
        currentlyPlaying = true;
        break;
      case 'Pause':
        cancelAnimationFrame(animation);
        currentlyPlaying = false;
        playBtn.style.color = '#000000';
        break;
      default:
        break;
    }
  });
});

// Start functions
init();
animate();
