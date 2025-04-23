import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createOctopus, createSquid, createCrab } from '../models/enemys.js';


let joystickMoving, base, sphere, cylinder, button;
let isDragging = false;
let isButtonPressed = false;
let mouseX = 0, mouseY = 0;
let initialMouseX = 0, initialMouseY = 0;
let initialRotX = 0, initialRotZ = 0;
let buttonOriginalY = 0;
let renderer, scene, camera;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(180, 180, 60);
  camera.lookAt(scene.position);
  scene.add(camera);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(100, 100, 100).normalize();
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
  pointLight.position.set(50, 50, 50);
  scene.add(pointLight);

  const octopus = createOctopus();
  octopus.mesh.position.set(0, 140, -50);
  octopus.mesh.rotation.y = Math.PI/2.5;
  octopus.mesh.scale.set(2, 2, 2);
  scene.add(octopus.mesh);

  const crab = createCrab();
  crab.mesh.position.set(0, 140, -100); 
  crab.mesh.rotation.y = Math.PI/2.5;
  crab.mesh.scale.set(2, 2, 2);
  scene.add(crab.mesh);

  const squid = createSquid();
  squid.mesh.position.set(0, 140, -150);
  squid.mesh.rotation.y = Math.PI/2.5;
  squid.mesh.scale.set(2, 2, 2);
  scene.add(squid.mesh);

  const baseGeometry = new THREE.CylinderGeometry(8, 8, 5, 32);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.5, roughness: 0.5 });
  base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.set(0, 2.5, 0);
  scene.add(base);

  const buttonGeometry = new THREE.CylinderGeometry(10, 10, 5, 32);
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.5, roughness: 0.5 });
  button = new THREE.Mesh(buttonGeometry, buttonMaterial);
  button.position.set(-20, base.position.y + 2.5, 80);
  buttonOriginalY = button.position.y;
  scene.add(button);

  joystickMoving = new THREE.Group();
  scene.add(joystickMoving);

  const cylinderGeometry = new THREE.CylinderGeometry(5, 5, 70, 32);
  const greyMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.5, roughness: 0.5 });
  cylinder = new THREE.Mesh(cylinderGeometry, greyMaterial);
  cylinder.position.set(0, 35, 0);
  joystickMoving.add(cylinder);

  const sphereGeometry = new THREE.SphereGeometry(20, 32, 32);
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.5, roughness: 0.5 });
  sphere = new THREE.Mesh(sphereGeometry, redMaterial);
  sphere.position.set(0, 80, 0);
  joystickMoving.add(sphere);

  const heartShape = new THREE.Shape();
  heartShape.moveTo(25, 25);
  heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0);
  heartShape.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  heartShape.bezierCurveTo(-30, 55, -10, 77, 25, 95);
  heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35);
  heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0);
  heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25);

  const heartgeometry = new THREE.ShapeGeometry(heartShape);
  const heartmaterial = new THREE.MeshBasicMaterial({ color: 0x4d0000 });
  const heart = new THREE.Mesh(heartgeometry, heartmaterial);
  scene.add(heart);
  heart.position.set(0, 30, -250);
  heart.rotation.z = Math.PI;
  heart.rotation.y = 1;
  

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(new THREE.Color(0x000000), 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('contextmenu', e => e.preventDefault(), false);
  
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener('mouseup', onMouseUp, false);

  animate();

  const loader = new GLTFLoader();

  loader.load('../models/pink_invader.glb', (gltf) => {
    console.log('GLTF loaded:', gltf);
    const model = gltf.scene;
    model.position.set(0, 115, 10);
    model.rotation.y = Math.PI/2.5;
    model.scale.set(2, 2, 2);
    scene.add(model);
  }, undefined, (error) => {
    console.error(error);
  });

  loader.load('../models/arcade.glb', (gltf) => {
    console.log('GLTF loaded:', gltf);
    const model1 = gltf.scene;
    model1.position.set(-50, 0, 200);
    model1.rotation.y = 2.5;
    model1.scale.set(15,15,15);
    scene.add(model1);
  }, undefined, (error) => {
    console.error(error);
  });

  loader.load('../models/spaceship.glb', (gltf) => {
    console.log('GLTF loaded:', gltf);
    const model1 = gltf.scene;
    model1.position.set(10, 0, 250);
    model1.rotation.y = 2.5;
    model1.scale.set(0.1,0.1,0.1);
    scene.add(model1);
  }, undefined, (error) => {
    console.error(error);
  });

}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  if (isDragging) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }
}

function onMouseDown(event) {
  if (event.button === 2) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sphere);
    if (intersects.length > 0) {
      isDragging = true;
      initialMouseX = event.clientX;
      initialMouseY = event.clientY;
      initialRotX = joystickMoving.rotation.x;
      initialRotZ = joystickMoving.rotation.z;
    }
  }
  else if (event.button === 0) {
    isButtonPressed = true;
    button.position.y = buttonOriginalY - 2;
  }
}

function onMouseUp(event) {
  if (event.button === 2) {
    isDragging = false;
  }
  else if (event.button === 0) {
    if (isButtonPressed) {
      isButtonPressed = false;
      button.position.y = buttonOriginalY;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const maxAngle = Math.PI / 4;

  if (isDragging) {
    const deltaX = (mouseX - initialMouseX) / window.innerWidth;
    const deltaY = (mouseY - initialMouseY) / window.innerHeight;

    let desiredRotX = initialRotX - deltaX * maxAngle;
    let desiredRotZ = initialRotZ - deltaY * maxAngle;

    desiredRotX = THREE.MathUtils.clamp(desiredRotX, -maxAngle, maxAngle);
    desiredRotZ = THREE.MathUtils.clamp(desiredRotZ, -maxAngle, maxAngle);

    joystickMoving.rotation.x = desiredRotX;
    joystickMoving.rotation.z = desiredRotZ;
  } else {
    joystickMoving.rotation.x += (0 - joystickMoving.rotation.x) * 0.1;
    joystickMoving.rotation.z += (0 - joystickMoving.rotation.z) * 0.1;
  }
  renderer.render(scene, camera);

  if (window.bgController) {
    const worldPos = new THREE.Vector3();
    sphere.getWorldPosition(worldPos);

    worldPos.project(camera); 

    const x = (worldPos.x + 1) / 2;
    const y = (1 - worldPos.y) / 2;

    window.bgController.updateJoystick(new THREE.Vector2(x, y));
  }
}

window.onload = init;
