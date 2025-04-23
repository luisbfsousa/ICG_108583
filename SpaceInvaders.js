document.getElementById("playButton").addEventListener("click", () => {
  setTimeout(startGame, 1000);
});

import * as THREE from 'three';
import { createOctopus, createSquid, createCrab } from './models/enemys.js';

let player;
let points = 0;
let aliens = [];
let enemyPhase = 1; 
let playerLives = 3;
let currentLevel = 1; 
let gameOver = false;
let projectiles = [];
let playerSpeed = 0.1;
let alienDirection = 1;
let playAreaLimit = 11;
let particleSystems = [];
let alienProjectiles = [];
let scene, camera, renderer;
let isCameraTransitioning = false;
let lastAlienMoveTime = Date.now();
let cameraTargetLookAt = new THREE.Vector3();
let cameraTargetPosition = new THREE.Vector3();

const keys = {};
const verticalStep = 1;
const horizontalStep = 1;
const horizontalOffset = -2; 
const alienMoveDelay = 1000;
const PARTICLE_LIFETIME = 1000;
const PLAYER_PROJECTILE_RANGE = 7;
const PLAYER_PROJECTILE_SPEED = 0.1;
const sounds = {shoot: new Audio('sounds/shoot.mp3'), impact: new Audio('sounds/impact.mp3'), death: new Audio('sounds/death.mp3') };

Object.values(sounds).forEach(sound => {
  sound.preload = 'auto';
  sound.volume = 0.5;
});

async function loadShader(url) {
  const response = await fetch(url);
  return response.text();
}

function createExplosion(position, color, count = 50) {
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesMaterial = new THREE.PointsMaterial({color: color,  size: 0.1,transparent: true,opacity: 1,blending: THREE.AdditiveBlending});
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    velocities[i * 3] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    opacities[i] = 1;
    sizes[i] = 0.1 + Math.random() * 0.1;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  particlesGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
  particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  particles.position.copy(position);

  particles.userData = {
    lifetime: 0,
    velocities: velocities,
    opacities: opacities,
    sizes: sizes
  };

  scene.add(particles);
  particleSystems.push(particles);
  return particles;
}

function updateParticles() {
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    const particles = particleSystems[i];
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    const opacities = particles.userData.opacities;
    const sizes = particles.userData.sizes;
    particles.userData.lifetime += 16;

    for (let j = 0; j < positions.length; j += 3) {
      positions[j] += velocities[j];
      positions[j + 1] += velocities[j + 1];
      positions[j + 2] += velocities[j + 2];
    }

    const progress = particles.userData.lifetime / PARTICLE_LIFETIME;
    for (let j = 0; j < opacities.length; j++) {
      opacities[j] = 1 - progress;
      sizes[j] *= 0.99;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.opacity.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
    if (particles.userData.lifetime >= PARTICLE_LIFETIME) {
      scene.remove(particles);
      particleSystems.splice(i, 1);
    }
  }
}

// ------------------- Leaderboard Setup -------------------
function prefillLeaderboard() {
  const existing = getLeaderboardData();
  if (existing.length > 0) {return;}
  const initialData = [{ name: "%app%",score: 10000 },{ name: "Teste",score: 90 },{ name: "AHHHH",score: 70 },{ name: "Quart",score: 60 },{ name: "Quint",score: 55 },{ name: "Sexto",score: 50 },{ name: "Seti",score: 40 },{ name: "Oitav",score: 30 },{ name: "Non",score: 25 }];
  saveLeaderboardData(initialData);
}

function getLeaderboardData() {
  const stored = localStorage.getItem('leaderboard');
  return stored ? JSON.parse(stored) : [];
}

function saveLeaderboardData(data) {
  localStorage.setItem('leaderboard', JSON.stringify(data));
}

function storeNewScore(name, score) {
  const data = getLeaderboardData();
  data.push({ name, score });
  saveLeaderboardData(data);
}

function updateLeaderboard() {
  const data = getLeaderboardData();
  data.sort((a, b) => b.score - a.score);
  data.splice(9);
  const container = document.getElementById("leaderboardContent");
  container.innerHTML = "";
  data.forEach((entry, index) => {
    const rank = index + 1;
    let suffix;
    switch (rank) {
      case 1: suffix = "ST"; break;
      case 2: suffix = "ND"; break;
      case 3: suffix = "RD"; break;
      default: suffix = "TH"; break;
    }

    const row = document.createElement("div");
    row.classList.add("leaderboard-row");
    const posDiv = document.createElement("div");
    posDiv.classList.add("leaderboard-pos");
    posDiv.textContent = `${rank}${suffix}`;
    row.appendChild(posDiv);
    const nameDiv = document.createElement("div");
    nameDiv.classList.add("leaderboard-name");
    nameDiv.textContent = entry.name;
    if (rank === 1){ nameDiv.style.color = "blue"; } 
    else if (rank === 2){ nameDiv.style.color = "orange"; } 
    else if (rank === 3){ nameDiv.style.color = "green"; } 
    else { nameDiv.style.color = "yellow"; }
    row.appendChild(nameDiv);
    const scoreDiv = document.createElement("div");
    scoreDiv.classList.add("leaderboard-score");
    scoreDiv.textContent = entry.score;
    row.appendChild(scoreDiv);
    container.appendChild(row);
  });
}

// ------------------- Score Board & Lives Display -------------------
function updateScoreBoard() {
  const scoreBoard = document.getElementById("scoreBoard");
  scoreBoard.innerHTML = `Score : ${points}`;
}

// NEW: separate function to update the "lives" container
function updateLivesDisplay() {
  const livesEl = document.getElementById("livesContainer");
  livesEl.innerHTML = `Lifes: ${playerLives}`;
}

/*
function updateAliens() {
  const now = Date.now();
  // Speed increases as aliens are eliminated (minimum 300ms delay)
  const speedFactor = Math.max(0.3, aliens.length / (rows * cols));
  const currentMoveDelay = alienMoveDelay * speedFactor;
  
  if (now - lastAlienMoveTime < currentMoveDelay) return;
  lastAlienMoveTime = now;

  // Rest of the function remains the same...
}*/ // ideia para dificuldade

function updateLivesPosition() {
  const livesEl = document.getElementById('livesContainer');
  if (currentLevel === 3) {
    livesEl.style.position = 'fixed';
    livesEl.style.left = '20px';
    livesEl.style.top = '20px';
  } else {
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const vector = new THREE.Vector3();
    vector.copy(player.position);
    vector.project(camera);
    const x = (vector.x + 1) / 2 * canvasRect.width + canvasRect.left;
    const y = (-vector.y + 1) / 2 * canvasRect.height + canvasRect.top;
    const offsetX = 30;
    const offsetY = -10;
    livesEl.style.position = 'absolute';
    livesEl.style.left = (x + offsetX) + 'px';
    livesEl.style.top = (y + offsetY) + 'px';
  }
}

// ------------------- Keyboard Handling -------------------
document.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.key === " ") {
    shootProjectile();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

// ------------------- Game Initialization -------------------
async function startGame() {
  points = 0;
  playerLives = 3;
  gameOver = false;
  updateScoreBoard();
  const livesEl = document.getElementById("livesContainer");
  livesEl.classList.remove("hidden");
  updateLivesDisplay();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  setCameraView();

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(light);

  const playerGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
  const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.y = -5;
  player.position.x = horizontalOffset;
  scene.add(player);

  projectiles = [];
  resetAliens();
  createGameBox();
  const asteroidBelt = createBelt();

  const fragmentShaderCode = await loadShader('space.txt');
  const backgroundScene = new THREE.Scene();
  const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  backgroundCamera.position.z = 1;

  const backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {u_time: { value: 0.0 },u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }},
    vertexShader: `void main() {gl_Position = vec4(position, 1.0);}`,
    fragmentShader: fragmentShaderCode,
    depthWrite: false
  });

  const backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backgroundMaterial);
  backgroundScene.add(backgroundMesh);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    backgroundMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    backgroundMaterial.uniforms.u_time.value += clock.getDelta();

    if (!gameOver && asteroidBelt) {
      asteroidBelt.animate();
    }
  
    if (!gameOver) {
      updatePlayerMovement();
      updateParticles();
      if (currentLevel === 3 && !isCameraTransitioning) {
        const offset = new THREE.Vector3(0, 0.3, 0.5);
        camera.position.copy(player.position.clone().add(offset));
        const lookAt = player.position.clone().add(new THREE.Vector3(0, 500, 0));
        camera.lookAt(lookAt);
      }

      for (let i = alienProjectiles.length - 1; i >= 0; i--) {
        const bullet = alienProjectiles[i];
        bullet.position.y -= 0.1;
        if (bullet.position.y < -10) {
          scene.remove(bullet);
          alienProjectiles.splice(i, 1);
          continue;
        }

        const dx = bullet.position.x - player.position.x;
        const dy = bullet.position.y - player.position.y;
        const dz = bullet.position.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.5 && !alienProjectiles[i].userData?.fromDodgingAlien) {
          scene.remove(bullet);
          alienProjectiles.splice(i, 1);
          playerLives--;
          updateLivesDisplay();
          updateScoreBoard();
          sounds.impact.currentTime = 0;
          sounds.impact.play();
          if (playerLives <= 0) {
            createExplosion(player.position.clone(), 0x30bdff, 100);
            gameOver = true;
            displayGameOverPopup();
            sounds.death.currentTime = 0;
            sounds.death.play();
          }
        }
      }
  
      for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
        const projectile = projectiles[pIndex];
        projectile.position.y += PLAYER_PROJECTILE_SPEED;
        if (projectile.position.y > PLAYER_PROJECTILE_RANGE) {
          scene.remove(projectile);
          projectiles.splice(pIndex, 1);
        }
      }

      if (currentLevel === 3 && !isCameraTransitioning) {
        const offset = new THREE.Vector3(0, 0.3, 0.5);
        camera.position.copy(player.position.clone().add(offset));
        const lookAt = player.position.clone().add(new THREE.Vector3(0, 500, 0));
        camera.lookAt(lookAt);
      }
      
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const playerBullet = projectiles[i];
        for (let j = alienProjectiles.length - 1; j >= 0; j--) {
          const alienBullet = alienProjectiles[j];
          const dx = playerBullet.position.x - alienBullet.position.x;
          const dy = playerBullet.position.y - alienBullet.position.y;
          const dz = playerBullet.position.z - alienBullet.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 0.3) {
            scene.remove(playerBullet);
            scene.remove(alienBullet);
            projectiles.splice(i, 1);
            alienProjectiles.splice(j, 1);
            break;
          }
        }
      }

      for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
        const projectile = projectiles[pIndex];
        projectile.position.y += PLAYER_PROJECTILE_SPEED;
        if (asteroidBelt.checkAsteroidHit(projectile)) {
          scene.remove(projectile);
          projectiles.splice(pIndex, 1);
          continue;
        }

        const projectileBox = new THREE.Box3().setFromObject(projectile);
        for (let aIndex = aliens.length - 1; aIndex >= 0; aIndex--) {
          const alien = aliens[aIndex];
          const alienBox = new THREE.Box3().setFromObject(alien);
          if (alienBox.intersectsBox(projectileBox) && !alien.userData.isDodging) {
            let explosionColor;
            switch(alien.userData.type) {
              case 'octopus': explosionColor = 0xffee00; break;
              case 'crab': explosionColor = 0x08ffff; break;
              case 'squid': explosionColor = 0xec20eb; break;
              default: explosionColor = 0xff0000; break;
            }

            createExplosion(alien.position.clone(), explosionColor, 30);
            scene.remove(alien);
            scene.remove(projectile);
            aliens.splice(aIndex, 1);
            projectiles.splice(pIndex, 1);
            points += 10;
            updateScoreBoard();
            sounds.impact.currentTime = 0;
            sounds.impact.play();
            break;
          }
        }
      
        if (projectile.position.y > PLAYER_PROJECTILE_RANGE) {
          scene.remove(projectile);
          projectiles.splice(pIndex, 1);
        }
      }
  
      updateAliens();
      checkPlayerCollision();
      checkLevelCompletion();
      updateLivesPosition();
    }
  
    if (isCameraTransitioning) {
      const currentPosition = camera.position.clone();
      const lerpSpeed = currentLevel === 3 ? 0.15 : 0.05;
      const newPosition = currentPosition.lerp(cameraTargetPosition, lerpSpeed);
      camera.position.copy(newPosition);
      const currentLook = new THREE.Vector3();
      camera.getWorldDirection(currentLook);
      const newLook = currentLook.lerp(cameraTargetLookAt.clone().sub(camera.position).normalize(),lerpSpeed);
      camera.lookAt(camera.position.clone().add(newLook));
      camera.lookAt(camera.position.clone().add(newLook));
      const positionDiff = camera.position.distanceTo(cameraTargetPosition);
      const lookDiff = camera.getWorldDirection(new THREE.Vector3()).distanceTo(cameraTargetLookAt.clone().sub(camera.position).normalize());
      if (positionDiff < 0.05 && lookDiff < 0.05) {
        camera.position.copy(cameraTargetPosition);
        camera.lookAt(cameraTargetLookAt);
        isCameraTransitioning = false;
        if (aliens.length === 0) {
          resetAliens();
        }
      }
    }

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.render(scene, camera);
  }  
  animate();
}


// ------------------- Player Movement -------------------
function updatePlayerMovement() {
  if (keys["a"] || keys["arrowleft"]) {player.position.x = Math.max(-playAreaLimit + horizontalOffset, player.position.x - playerSpeed);}
  if (keys["d"] || keys["arrowright"]) {player.position.x = Math.min(playAreaLimit + horizontalOffset, player.position.x + playerSpeed);}
}

// ------------------- Projectiles -------------------
const maxProjectiles = 5;
function shootProjectile() {
  if (projectiles.length >= maxProjectiles) return;
  sounds.shoot.currentTime = 0;
  sounds.shoot.play();
  const projectileGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const projectileMaterial = new THREE.MeshBasicMaterial({color: 0x30bdff,transparent: true,opacity: 0.9});
  const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
  projectile.position.set(player.position.x, player.position.y + 0.5, 0);
  const glowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const glowMaterial = new THREE.MeshBasicMaterial({color: 0x30bdff,transparent: true,opacity: 0.3,blending: THREE.AdditiveBlending});
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  projectile.add(glowMesh);
  scene.add(projectile);
  projectiles.push(projectile);
}

function alienShoot(alien) {
  const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xff0101, transparent: true,opacity: 0.9});
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.set(alien.position.x, alien.position.y - 0.5, alien.position.z);
  const glowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const glowMaterial = new THREE.MeshBasicMaterial({color: 0xff0101,transparent: true,opacity: 0.3,blending: THREE.AdditiveBlending});
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  bullet.add(glowMesh);
  bullet.userData.fromDodgingAlien = currentLevel === 2 && alien.userData.isDodging;
  scene.add(bullet);
  alienProjectiles.push(bullet);
}

// ------------------- Alien Movement (Discrete Steps) -------------------
function updateAliens() {
  const now = Date.now();
  if (now - lastAlienMoveTime < alienMoveDelay) return;
  lastAlienMoveTime = now;
  const leftBoundary = -11 + horizontalOffset; // apply horizontal offset
  const rightBoundary = 11 + horizontalOffset; // apply horizontal offset
  let hitBoundary = false;
  aliens.forEach(alien => {
    if ((alien.position.x + horizontalStep * alienDirection) < leftBoundary || (alien.position.x + horizontalStep * alienDirection) > rightBoundary) {
      hitBoundary = true;
    }
  });
  if (hitBoundary) {
    aliens.forEach(alien => {
      alien.position.y -= verticalStep;
    });
    alienDirection *= -1;
  } else {
    aliens.forEach(alien => {
      alien.position.x += horizontalStep * alienDirection;
    });
  }
}

function checkPlayerCollision() {
  const playerBox = new THREE.Box3().setFromObject(player);
  for (let i = 0; i < aliens.length; i++) {
    const alien = aliens[i];
    const alienBox = new THREE.Box3().setFromObject(alien);
    if (alienBox.intersectsBox(playerBox)) {
      console.log("Player hit!");
      playerLives--;
      updateLivesDisplay();
      sounds.impact.currentTime = 0;
      sounds.impact.play();
      if (playerLives <= 0) {
        console.log("Game Over!");
        createExplosion(player.position.clone(), 0x30bdff, 100);
        gameOver = true;
        displayGameOverPopup();
        sounds.death.currentTime = 0;
        sounds.death.play();
      }
      break;
    }
  }
}

// ------------------- Game Over Popup -------------------
function displayGameOverPopup() {
  const overlay = document.getElementById("gameOverOverlay");
  overlay.classList.remove("hidden");
  const input = document.getElementById("gameOverInput");
  input.innerText = "";
  input.focus();
  const newInputHandler = function enforceMaxLength() {
    if (input.innerText.length > 5) {
      input.innerText = input.innerText.substring(0, 5);
      placeCaretAtEnd(input);
    }
  };

  input.removeEventListener("input", newInputHandler);
  input.addEventListener("input", newInputHandler);
  function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  const submitButton = document.getElementById("gameOverSubmit");
  submitButton.onclick = function () {
    let playerName = input.innerText.replace(/\s+/g, ' ').trim();
    if (playerName === "") playerName = "???";
    console.log("Player Name:", playerName);
    storeNewScore(playerName, points);
    location.reload();
  };
}

// ------------------- Level Progression -------------------
function checkLevelCompletion() {
  if (aliens.length === 0 && !gameOver && !isCameraTransitioning) {
    points += 50;
    updateScoreBoard();
    projectiles.forEach(proj => scene.remove(proj));
    projectiles.length = 0;
    alienProjectiles.forEach(proj => scene.remove(proj));
    alienProjectiles.length = 0;
    currentLevel = (currentLevel % 3) + 1;
    if (enemyPhase < 5) {
      enemyPhase++;
    }

    console.log("Progressing to Level", currentLevel, "Phase", enemyPhase);
    setCameraView();
    resetAliens();
  }
}

function setCameraView() {
  if (!camera) return;
  isCameraTransitioning = true;
  if (currentLevel === 1) {
    cameraTargetPosition.set(0, 0, 10);
    cameraTargetLookAt.set(0, 0, 0);
  } else if (currentLevel === 2) {
    cameraTargetPosition.set(-1, -13, 2);
    cameraTargetLookAt.set(-1, 0, 0);
  } else if (currentLevel === 3) {
    cameraTargetPosition.copy(player.position.clone().add(new THREE.Vector3(0, 0.3, 0.5)));
    cameraTargetLookAt.copy(player.position.clone().add(new THREE.Vector3(0, 500, 0)));
  }

  aliens.forEach(alien => {
    if (currentLevel === 1) {
      alien.rotation.set(0, 0, 0);
      if (alien.userData?.originalZ !== undefined) {
        alien.position.z = alien.userData.originalZ;
      }
    } else {
      alien.rotation.set(Math.PI/2+0.2, 0, 0);
      alien.position.z = 0;
    }
    alien.userData.isDodging = false;
  });
}

function resetAliens() {
  if (!scene) return;
  aliens.forEach(alien => scene.remove(alien));
  aliens.length = 0;
  let rows, cols;

  if (enemyPhase === 1) { rows = 1; cols = 3; } 
  else if (enemyPhase === 2) { rows = 2; cols = 3; } 
  else if (enemyPhase === 3) { rows = 3; cols = 3; } 
  else if (enemyPhase === 4) { rows = 4; cols = 4; } 
  else { rows = 5; cols = 5; }

  const baseYOffset = 7;
  const alienSpacing = 1.5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let alienMesh;
      if (r < Math.floor(rows / 3)) {
          const octopus = createOctopus();
          alienMesh = octopus.mesh;
          alienMesh.userData = { 
              pixelArt: octopus,
              type: 'octopus',
              isDodging: false,
              originalZ: 0
          };
      } else if (r < Math.floor(rows * 2 / 3)) {
          const crab = createCrab();
          alienMesh = crab.mesh;
          alienMesh.userData = {
              pixelArt: crab,
              type: 'crab',
              isDodging: false,
              originalZ: 0
          };
      } else {
          const squid = createSquid();
          alienMesh = squid.mesh;
          alienMesh.userData = {
              pixelArt: squid,
              type: 'squid',
              isDodging: false,
              originalZ: 0
          };
      }

      alienMesh.position.set((c - cols / 2) * alienSpacing + horizontalOffset,baseYOffset - (r * alienSpacing * 0.8),0);
      alienMesh.scale.set(0.1, 0.1, 0.1);
      if (currentLevel !== 1) {
        alienMesh.rotation.set(Math.PI/2, 0, 0);
      }

      scene.add(alienMesh);
      aliens.push(alienMesh);
      alienMesh.userData.pixelArt = alienMesh.parent;
      alienMesh.userData.isDodging = false;
      alienMesh.userData.originalZ = alienMesh.position.z;
      const tryDodge = () => {
        if (gameOver || (currentLevel !== 2 && currentLevel !== 3) || !aliens.includes(alienMesh)) return;
        alienMesh.userData.isDodging = true;
        alienMesh.position.z += (Math.random() < 0.5 ? 1.5 : -1.5);
        setTimeout(() => {
          if (aliens.includes(alienMesh)) {
            alienMesh.position.z = alienMesh.userData.originalZ;
            alienMesh.userData.isDodging = false;
            setTimeout(tryDodge, 2000 + Math.random() * 3000);
          }
        }, 100 + Math.random() * 3900);
      };
      setTimeout(tryDodge, 1000 + Math.random() * 2000);
      const shootRandomly = () => {
        if (!gameOver && aliens.includes(alienMesh)) {
          alienShoot(alienMesh);
          setTimeout(shootRandomly, 3000 + Math.random() * 4000);
        }
      };
      setTimeout(shootRandomly, 1000 + Math.random() * 2000);
    }
  }
}

// ------------------- Game Box (Visible Boundaries) -------------------
function createGameBox() {
  const boxWidth = 22;
  const boxHeight = 16;
  const boxDepth = 1;
  const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const edges = new THREE.EdgesGeometry(boxGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const gameBox = new THREE.LineSegments(edges, lineMaterial);
  gameBox.position.set(horizontalOffset, 0, -1);
  scene.add(gameBox);
}

function createBelt() {
  const radius = 20;
  const segments = 75;
  const belt = new THREE.Group();
  const sizeTiers = [{ min: 0.2, max: 0.3, speedMult: 3.5, type: 'small' }, 
                     { min: 0.4, max: 0.6, speedMult: 1.7, type: 'medium' },
                     { min: 0.7, max: 1.0, speedMult: 1, type: 'large' }];
  
  const launchProbabilities = {small: 0.1,medium: 0.1,large: 0.1};

  const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x888888,roughness: 0.8,metalness: 0.2});
  const attackMaterial = new THREE.MeshStandardMaterial({ color: 0xff66aa,roughness: 0.7,metalness: 0.2});
  try {
    const textureLoader = new THREE.TextureLoader();
    const asteroidTexture = textureLoader.load('images/asteroid_texture.jpg');
    asteroidTexture.wrapS = THREE.RepeatWrapping;
    asteroidTexture.wrapT = THREE.RepeatWrapping;
    asteroidTexture.repeat.set(1, 1);
    beltMaterial.map = asteroidTexture;
    attackMaterial.map = asteroidTexture;
  } catch (e) {
    console.log("Using fallback materials - texture not found");
  }

  const launchedAsteroids = [];
  let lastLaunchCheck = Date.now();
  for (let i = 0; i <= segments; i++) {
    createBeltAsteroid();
  }

  function createBeltAsteroid() {
    const theta = (Math.random() * Math.PI) - (Math.PI / 2);
    const tierRoll = Math.random();
    let tierIndex;
    if (tierRoll < 0.6) tierIndex = 0;
    else if (tierRoll < 0.9) tierIndex = 1;
    else tierIndex = 2;
    const tier = sizeTiers[tierIndex];
    const size = tier.min + Math.random() * (tier.max - tier.min);
    const geometry = tierIndex === 2 
      ? new THREE.IcosahedronGeometry(size, 1) 
      : new THREE.SphereGeometry(size, 8, 6);
    const zOffset = (Math.random() - 0.5) * (2 - tierIndex * 0.6);
    const asteroid = new THREE.Mesh(geometry, beltMaterial);
    asteroid.position.set(Math.cos(theta) * radius + horizontalOffset, Math.sin(theta) * radius, zOffset);
    asteroid.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    asteroid.userData = {
      speed: 0.005 + Math.random() * 0.01,
      direction: Math.random() < 0.5 ? 1 : -1,
      horizontalSpeed: (Math.random() - 0.5) * 0.08,
      rotationSpeed: 0.005 + Math.random() * 0.01,
      sizeType: tier.type
    };
    belt.add(asteroid);
    return asteroid;
  }

  belt.position.set(0, 0, 1);
  belt.position.x += horizontalOffset;
  belt.rotation.z = Math.PI / 2;
  scene.add(belt);
  function animateBelt() {
    const now = Date.now();
    if (now - lastLaunchCheck > 100) {
      lastLaunchCheck = now;
      if (Math.random() < launchProbabilities.small * 0.1) {launchNewAsteroid(0);}    // small
      if (Math.random() < launchProbabilities.medium * 0.1) {launchNewAsteroid(1); } // medium
      if (Math.random() < launchProbabilities.large * 0.1) {launchNewAsteroid(2); } // large
    }

    for (let i = launchedAsteroids.length - 1; i >= 0; i--) {
      const asteroid = launchedAsteroids[i];
      asteroid.position.y -= 0.10;
      asteroid.position.x += asteroid.userData.horizontalSpeed;
      asteroid.userData.horizontalSpeed *= 1.01;
      asteroid.rotation.x += asteroid.userData.rotationSpeed;
      asteroid.rotation.y += asteroid.userData.rotationSpeed * 0.7;
      asteroid.rotation.z += asteroid.userData.rotationSpeed * 0.5;
      if (asteroid.position.y < -10 || Math.abs(asteroid.position.x - horizontalOffset) > 15) {
        removeAsteroid(asteroid, launchedAsteroids, i);
        continue;
      }

      const playerDist = Math.sqrt(Math.pow(asteroid.position.x - player.position.x, 2) + Math.pow(asteroid.position.y - player.position.y, 2));
      if (asteroid.position.x === 1000) {
        removeAsteroid(asteroid, launchedAsteroids, i);
        continue;
      }

      if (playerDist < 0.8) {
        playerLives--;
        updateLivesDisplay();
        removeAsteroid(asteroid, launchedAsteroids, i);
        sounds.impact.currentTime = 0;
        sounds.impact.play();
        if (playerLives <= 0){
          createExplosion(player.position.clone(), 0x30bdff, 100);
          gameOver = true;
          displayGameOverPopup();
          sounds.death.currentTime = 0;
          sounds.death.play();
        }continue;
      }
      
      for (let j = aliens.length - 1; j >= 0; j--) {
        const alien = aliens[j];
        const alienDist = Math.sqrt(Math.pow(asteroid.position.x - alien.position.x, 2) + Math.pow(asteroid.position.y - alien.position.y, 2));
        if (alienDist < 0.7) {
          let explosionColor;
          switch(alien.userData.type){
            case 'octopus': explosionColor = 0xffee00; break;
            case 'crab': explosionColor = 0x08ffff; break;
            case 'squid': explosionColor = 0xec20eb; break;
            default: explosionColor = 0xff0000; break;
          }
          createExplosion(alien.position.clone(), explosionColor, 20);
          scene.remove(alien);
          aliens.splice(j, 1);
          sounds.impact.currentTime = 0;
          sounds.impact.play();
          if (asteroid.userData.sizeType === 'small') {
            removeAsteroid(asteroid, launchedAsteroids, i);
          } else if (asteroid.userData.sizeType === 'medium') {
            const pos = asteroid.position.clone();
            removeAsteroid(asteroid, launchedAsteroids, i);
            createSplitAsteroid(pos, 'small', Math.PI/4);
            createSplitAsteroid(pos, 'small', -Math.PI/4);
          }
          break;
        }
      }
    }
    belt.children.forEach(asteroid => {
      const data = asteroid.userData;
      const angle = Math.atan2(asteroid.position.y, asteroid.position.x - horizontalOffset);
      const newAngle = angle + (data.speed * data.direction);
      asteroid.position.set(Math.cos(newAngle) * radius + horizontalOffset, Math.sin(newAngle) * radius, asteroid.position.z);
      asteroid.rotation.x += data.rotationSpeed;
      asteroid.rotation.y += data.rotationSpeed * 0.7;
    });
  }
  
  function launchNewAsteroid(tierIndex) {
    const tier = sizeTiers[tierIndex];
    const size = tier.min + Math.random() * (tier.max - tier.min);
    const geometry = tierIndex === 2 
      ? new THREE.IcosahedronGeometry(size, 1) 
      : new THREE.SphereGeometry(size, 8, 6);
    const asteroid = new THREE.Mesh(geometry, attackMaterial);
    const startX = (Math.random() * 16 - 8) + horizontalOffset;
    asteroid.position.set(startX, 10, 0);
    asteroid.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    asteroid.userData = {
      horizontalSpeed: (Math.random() - 0.5) * 0.07,
      rotationSpeed: 0.005 + Math.random() * 0.01,
      curveFactor: 1 + Math.random() * 0.02,
      sizeType: tier.type,
      health: tierIndex + 1
    };
    scene.add(asteroid);
    launchedAsteroids.push(asteroid);
  }
  
  function removeAsteroid(asteroid, array, index) {
    if (asteroid.userData.sizeType === 'small') {
      createExplosion(asteroid.position.clone(), 0x802e47, 30);
    }
    asteroid.position.set(1000, 1000, 1000);
    scene.remove(asteroid);
    if (array && index !== undefined) {
      array.splice(index, 1);
    }
  }

  function splitAsteroid(asteroid) {
    const position = asteroid.position.clone();
    const sizeType = asteroid.userData.sizeType;
    removeAsteroid(asteroid, launchedAsteroids);
    if (sizeType === 'large') {
      createSplitAsteroid(position, 'medium', Math.random() * Math.PI * 2);
      createSplitAsteroid(position, 'medium', Math.random() * Math.PI * 2);
    } else if (sizeType === 'medium') {
      createSplitAsteroid(position, 'small', Math.random() * Math.PI * 2);
      createSplitAsteroid(position, 'small', Math.random() * Math.PI * 2);
    }
  }

  function createSplitAsteroid(position, sizeType, angle) {
    const tierIndex = sizeType === 'small' ? 0 : (sizeType === 'medium' ? 1 : 2);
    const tier = sizeTiers[tierIndex];
    const size = tier.min + Math.random() * (tier.max - tier.min);
    const geometry = tierIndex === 2 
      ? new THREE.IcosahedronGeometry(size, 1) 
      : new THREE.SphereGeometry(size, 8, 6);
    const asteroid = new THREE.Mesh(geometry, attackMaterial);
    asteroid.position.copy(position);
    asteroid.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    const baseSpeed = sizeType === 'medium' ? 0.05 : 0.07;
    const speedVariation = 0.7 + Math.random() * 0.6;
    asteroid.userData = {
      horizontalSpeed: Math.cos(angle) * baseSpeed * speedVariation,
      verticalSpeed: -baseSpeed * (0.5 + Math.abs(Math.sin(angle)) * speedVariation),
      rotationSpeed: 0.01 + Math.random() * 0.02,
      sizeType: sizeType,
      health: 1,
      isFragment: true
    };
    scene.add(asteroid);
    launchedAsteroids.push(asteroid);
  }

  function checkAsteroidHit(projectile) {
    for (let i = launchedAsteroids.length - 1; i >= 0; i--) {
      const asteroid = launchedAsteroids[i];
      if (asteroid.position.x === 1000) continue;
      const dist = Math.sqrt(Math.pow(projectile.position.x - asteroid.position.x, 2) + Math.pow(projectile.position.y - asteroid.position.y, 2));
      if (dist < 0.5) {
        scene.remove(projectile);
        splitAsteroid(asteroid);
        sounds.impact.currentTime = 0;
        sounds.impact.play();
        return true;
      }
    }
    return false;
  }
  return {group: belt,animate: animateBelt,checkAsteroidHit: checkAsteroidHit};
}

prefillLeaderboard();
updateLeaderboard();

// ======== DEBUG ========
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p") {
    currentLevel = (currentLevel % 3) + 1;
    setCameraView();
  }
});