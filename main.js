// REQUIRED imports
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

// Variables
var camera, scene, renderer, controls, mixer, animations, firstAnimation;
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
  // Where the rendered model is shown
  document.getElementById('canvas-container').appendChild(renderer.domElement); // Change 'canvas-container' for your html element id you want to show your model 
  /* Note: make sure you change css for applaying the same styles to the new object */
  
  // Adding controls to the objects
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; // Disabled moving the object with right click
  controls.enableDamping = true; // Enables damping (inertia) when rotate objects
  controls.dampingFactor = 0.05; // Inertia of the object [Note: Required update controls for this feature]
  controls.minPolarAngle = 1; // Unable rotate the model vertically
  controls.maxPolarAngle = 1; // Unable rotate the model vertically
  controls.minDistance = 1; // Minimum distance you can zoom in
  controls.maxDistance = 4; // Minimum distance you can zoom out
  controls.update(); // [Required] Update the controls after changes 
  
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
    animations = gltf.animations; // Load model animations
    
    mixer = new THREE.AnimationMixer(currentModel); // Create the mixer where all the animation is stored and can be controlled
    var clip = animations[0]; // Create the clip with the part of the animation you want to use
    firstAnimation = mixer.clipAction(clip); // Add the clip animation to the mixer
    firstAnimation.clampWhenFinished = true; // Set when the animation is finished, it pause
    firstAnimation.repetitions = 1; // Only loop once

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
    
    camera.lookAt(currentModel); // Change camera view position

  },undefined, function (error){ // Exception if an error ocurrs
    console.error(error); // Show the message on console
    alert(error); // Show a visual message (on page) with the error
  });
}

/* Generates the file names for the loading models */

function createFileName(elementID){
  const folder = "public/3Dmodels/"; // Folder path where the models are
  const imageID = elementID; // Get the ID of the image
  const fullFileName = folder + imageID + ".gltf"; // Creates the full name of the file by adding the extension for loading 3D models [.gltf]
  loadModel(fullFileName); // Calls for loading the model
}

// Select all the images with class ['.model-preview']
const imgElements = document.querySelectorAll('.model-preview'); // Change querySelectorAll('your_html_[tag/.class/#id]')

/* Displays the popUp window when clicking an image */

const windowPopUp = document.getElementById('popup'); // Select the window popUp

imgElements.forEach(function(element){ // loops all the images for displaying the right model
  // Listents for clicks on the images
  element.addEventListener('click', function (event) {
    windowPopUp.style.display = 'block'; // Change display to block for showing the popUp
    // Check if the object clicked is the same as one of the images
    if (element.id == event.target.id) { // Compares IDs
      // Call function for generating the model file name [createFileName(your_html_img_id)]
      createFileName(element.id);
    }
  });
});

/* Remove popUp window when clicking outsite the window */

windowPopUp.addEventListener('click', function(event){ // Event listener for clicking outside the popUp
  // If click outside the popUp window, it will disappear
  if (event.target.id === "popup") {
    windowPopUp.style.display = 'none'; // Change display to none for hidding the popUp window
    scene.remove(currentModel); // Removes the current model on the scene
    scene.remove(plane); // Removes the floor
    playBtn.style.color = '#000000'; // Reset the play button color
    isPlaying = false; // Reset animation
  }
});

/* Remove popUp window when clicking the close button */

const closebtn = document.getElementById('close-btn'); // Select the close button
// Event listener for clicking on close button
closebtn.addEventListener('click', function(event){
  windowPopUp.style.display = 'none'; // Change display to none for hidding the popUp window
  scene.remove(currentModel); // Removes the current model on the scene
  scene.remove(plane); // Removes the floor
  playBtn.style.color = '#000000'; // Reset the play button color
  isPlaying = false; // Reset animation
});

/* -- 3D Objects controls -- */

/* [Control buttons] rotates left object */
function rotateLeft(){
  currentModel.rotation.y -= 0.3; // Move the object to left
}
/* [Control buttons] rotates right object */
function rotateRight(){
  currentModel.rotation.y += 0.3; // Move the object to right
}

/* [Control buttons] Manual Zoom on a 3D Environment, this function modify the camera position mathematically for achieving the zoom result.*/
const distanceY = 0.0899255742939094; // Distance the camera will travel in Y axis
function zoom(){
  let distanceXZ = Math.hypot(camera.position.z, camera.position.x); // Calculates the hypotenuse of the x, z triangle (non rotation angles)
  let deg = Math.atan2(camera.position.z, camera.position.x); // Calculates the degree of the x, z triangle
  let sin = Math.sin(deg); // Get the sin
  let cos = Math.cos(deg); // Get the cos
  camera.position.z = sin * distanceXZ; // Set the camera Z position, multiplying the sinus and the hypotenuse
  camera.position.x = cos * distanceXZ; // Set the camera X position, multiplying the cosinus and the hypotenuse
  //console.log("Degree: ", deg); // Shows the degree of the triangle
  camera.updateProjectionMatrix(); // [REQUIRED] after doing changes
}

/* [Control buttons] Start animation when playing 'play' button */

var isPlaying = false; // aux variable for checking the status of the animation

function startAnimations(){
  if (!isPlaying) { // Check if the model is currently playing the animation
    isPlaying = true; // Set the status of animation to true
    firstAnimation.timeScale = 1; // Play the animation on 'normal' speed
    firstAnimation.reset().play(); // Reset and play the animation
  } else { // Reverse the animation
    isPlaying = false; // Set the status of animation to false
    firstAnimation.paused = false; // Disable paused of animation
    firstAnimation.timeScale = -1; // Reverse the speed of the animation
    firstAnimation.setLoop(THREE.LoopOnce); // Only allow looping once
  }
  mixer.addEventListener('finished', function(){ // When an animation is finished
    playBtn.style.color = '#000000'; // Change the color of the 'play' button
  });
}

/* [Control buttons] Stop all animation playing */

function stopAnimations(){
  mixer.stopAllAction(); // Stop all action currently playing
  isPlaying = false; // Reset the animation
}

/* -- Updates scene, controls and animations -- */

// [REQUIRED] for animation sync
var clock = new THREE.Clock();
// Animate and render the scene
function animate() {
  requestAnimationFrame(animate);

  if(mixer){ // if the model has animation it will play
    var deltaTime = clock.getDelta();
    mixer.update(deltaTime); // Animation sync
  }

  controls.update(); // Update the controls
  renderer.render(scene, camera); // Renders the complete scene
}

// Bottom center controls
const iconBtns = document.querySelectorAll('.icon-controls'); // Select all controls in the canvas
const playBtn = document.getElementById('play-icon'); // Select the play icon in controls

/* Switch between actions in every case a button is clicked */

// Creating an event listener for each control button
iconBtns.forEach(function(element){ 
  element.addEventListener('click', function(){ // Depending of wich element is clicked, will do a different thing
    switch (element.title) { // element.title == The title (html propertie) that has every control button
      case 'Rotate left':
        rotateLeft(); // Rotates the object to left
        break;
      case 'Rotate right':
        rotateRight(); // Rotates the object to right
        break;
      case 'Zoom in':
        camera.position.y -= distanceY;
        zoom(); // Activates the zoom
        break;
      case 'Zoom out':
        camera.position.y += distanceY;
        zoom(); // Activates the zoom
        break;
      case 'Play':
        startAnimations(); // Start playing animation
        playBtn.style.color = '#3b5e9c'; // Change 'Play' button color
        break;
      case 'Pause':
        stopAnimations(); // Stop playing animation
        playBtn.style.color = '#000000'; // Reset 'Play' button color
        break;
      default:
        break;
    }
  });
});

// Start functions
init();
animate();
