document.getElementById("playButton").addEventListener("click", () => {
  setTimeout(startGame, 1000);
});

let currentLevel = 1; 
let enemyPhase = 1; 
let scene, camera, renderer;
let aliens = [];
let player;
let projectiles = [];
let playAreaLimit = 11;
let playerSpeed = 0.1;
const keys = {};
let alienProjectiles = [];


const horizontalOffset = -2; 

let cameraTargetPosition = new THREE.Vector3();
let cameraTargetLookAt = new THREE.Vector3();
let isCameraTransitioning = false;

let alienDirection = 1;
let lastAlienMoveTime = Date.now();
const alienMoveDelay = 1000;
const horizontalStep = 1;
const verticalStep = 1;

let points = 0;
let playerLives = 3;
let gameOver = false;

async function loadShader(url) {
  const response = await fetch(url);
  return response.text();
}

function prefillLeaderboard() {
  const existing = getLeaderboardData();
  if (existing.length > 0) {
    return;
  }

  const initialData = [
    { name: "%app%", score: 10000 },
    { name: "Teste",  score: 90 },
    { name: "AHHHH",  score: 70 },
    { name: "Quart",  score: 60 },
    { name: "Quint",  score: 55 },
    { name: "Sexto",  score: 50 },
    { name: "Seti",   score: 40 },
    { name: "Oitav",  score: 30 },
    { name: "Non",    score: 25 },
  ];
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

function updateScoreBoard() {
  const scoreBoard = document.getElementById("scoreBoard");
  scoreBoard.innerHTML = `Score : ${points}`;
}

function updateLivesDisplay() {
  const livesEl = document.getElementById("livesContainer");
  livesEl.innerHTML = `Lifes: ${playerLives}`;
}

function toScreenPosition(obj, camera) {
  const vector = new THREE.Vector3();
  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;

  vector.copy(obj.position);
  vector.project(camera);

  vector.x = (vector.x * widthHalf) + widthHalf;
  vector.y = -(vector.y * heightHalf) + heightHalf;

  return { x: vector.x, y: vector.y };
}

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

document.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.key === " ") {
    shootProjectile();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

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

  const fragmentShaderCode = await loadShader('/shaders/space.glsl');
  const backgroundScene = new THREE.Scene();
  const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  backgroundCamera.position.z = 1;

  const backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
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
  
    if (!gameOver) {
      updatePlayerMovement();

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
          if (playerLives <= 0) {
            gameOver = true;
            displayGameOverPopup();
          }
        }
      }
  
      for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
        const projectile = projectiles[pIndex];
        projectile.position.y += 0.1;
        if (projectile.position.y > 5) {
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
        for (let aIndex = aliens.length - 1; aIndex >= 0; aIndex--) {
          const alien = aliens[aIndex];
          const dx = projectile.position.x - alien.position.x;
          const dy = projectile.position.y - alien.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const collisionThreshold = 0.4;
          if (distance < collisionThreshold && !alien.userData.isDodging) {
            scene.remove(alien);
            scene.remove(projectile);
            aliens.splice(aIndex, 1);
            projectiles.splice(pIndex, 1);
            points += 10;
            updateScoreBoard();
            break;
          }
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
      const newLook = currentLook.lerp(
        cameraTargetLookAt.clone().sub(camera.position).normalize(),
        lerpSpeed
      );
      camera.lookAt(camera.position.clone().add(newLook));
      camera.lookAt(camera.position.clone().add(newLook));
    
      const positionDiff = camera.position.distanceTo(cameraTargetPosition);
      const lookDiff = camera.getWorldDirection(new THREE.Vector3()).distanceTo(
        cameraTargetLookAt.clone().sub(camera.position).normalize()
      );
    
      if (positionDiff < 0.05 && lookDiff < 0.05) {
        camera.position.copy(cameraTargetPosition);
        camera.lookAt(cameraTargetLookAt);
        isCameraTransitioning = false;
      }
    }

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.render(scene, camera);
  }  

  animate();
}

function updatePlayerMovement() {
  if (keys["a"] || keys["arrowleft"]) {
    player.position.x = Math.max(-playAreaLimit + horizontalOffset, player.position.x - playerSpeed);
  }
  if (keys["d"] || keys["arrowright"]) {
    player.position.x = Math.min(playAreaLimit + horizontalOffset, player.position.x + playerSpeed);
  }
}

const maxProjectiles = 5;
function shootProjectile() {
  if (projectiles.length >= maxProjectiles) return;
  const projectileGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
  const projectileMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
  projectile.position.set(player.position.x, player.position.y + 0.5, 0);
  scene.add(projectile);
  projectiles.push(projectile);
}

function alienShoot(alien) {
  const bulletGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
  const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(alien.position.x, alien.position.y - 0.5, alien.position.z);
  bullet.userData.fromDodgingAlien = currentLevel === 2 && alien.userData.isDodging;
  scene.add(bullet);
  alienProjectiles.push(bullet);
}

function updateAliens() {
  const now = Date.now();
  if (now - lastAlienMoveTime < alienMoveDelay) return;
  lastAlienMoveTime = now;

  const leftBoundary = -11 + horizontalOffset; 
  const rightBoundary = 11 + horizontalOffset;
  let hitBoundary = false;
  aliens.forEach(alien => {
    if ((alien.position.x + horizontalStep * alienDirection) < leftBoundary ||
        (alien.position.x + horizontalStep * alienDirection) > rightBoundary) {
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
  for (let i = 0; i < aliens.length; i++) {
    const alien = aliens[i];
    const xDist = Math.abs(alien.position.x - player.position.x);
    const yDist = Math.abs(alien.position.y - player.position.y);
    if (xDist < (0.5 + 0.3) && yDist < (0.25 + 0.3)) {
      console.log("Player hit!");
      playerLives--;
      updateScoreBoard();
      updateLivesDisplay();
      if (playerLives <= 0) {
        console.log("Game Over!");
        gameOver = true;
        displayGameOverPopup();
      }
      break;
    }
  }
}

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

function checkLevelCompletion() {
  if (aliens.length === 0) {
    points += 50;
    updateScoreBoard();
    projectiles.forEach(proj => scene.remove(proj));
    projectiles.length = 0;
    currentLevel = (currentLevel % 3) + 1;
    if (enemyPhase < 5) { enemyPhase++; }
    setCameraView();
    resetAliens();
  }
}

function setCameraView() {
  if (!camera) return;

  if (currentLevel === 1) {
    cameraTargetPosition.set(0, 0, 10);
    cameraTargetLookAt.set(0, 0, 0);
    console.log("2D");

    aliens.forEach(alien => {
      if (alien.userData?.originalZ !== undefined) {
        alien.position.z = alien.userData.originalZ;
        alien.userData.isDodging = false;
      }
    });

  } else if (currentLevel === 2) {
    cameraTargetPosition.set(-1, -13, 2);
    cameraTargetLookAt.set(-1, 0, 0);
    console.log("Side POV");

  } else if (currentLevel === 3) {
    console.log("True POV (cockpit)");

    const offset = new THREE.Vector3(0, 0.3, 0.5);
    cameraTargetPosition.copy(player.position.clone().add(offset));

    cameraTargetLookAt.copy(player.position.clone().add(new THREE.Vector3(0, 500, 0)));
  }

  isCameraTransitioning = true;
}



function resetAliens() {
  if (!scene) return;
  aliens.forEach(alien => scene.remove(alien));
  aliens.length = 0;
  
  let rows, cols;
  if (enemyPhase === 1) { rows = 2; cols = 3; } 
  else if (enemyPhase === 2) { rows = 3; cols = 3; } 
  else if (enemyPhase === 3) { rows = 4; cols = 4; } 
  else if (enemyPhase === 4) { rows = 4; cols = 6; } 
  else { rows = 5; cols = 8; }
  
  const baseYOffset = 4;
  const alienSpacing = 1.5;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alienGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const alienMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const alien = new THREE.Mesh(alienGeometry, alienMaterial);
      alien.position.set(
        (c - cols / 2) * alienSpacing + horizontalOffset,
        (r - rows / 2) * alienSpacing + baseYOffset,
        0
      );
      scene.add(alien);
      aliens.push(alien);

      alien.userData.isDodging = false;
      alien.userData.originalZ = alien.position.z;

      const tryDodge = () => {
        if (gameOver || (currentLevel !== 2 && currentLevel !== 3) || !aliens.includes(alien)) return;

        const dodgeDuration = 100 + Math.random() * 3900; // 0.1s - 4s
        const dodgeOffset = Math.random() < 0.5 ? 1.5 : -1.5;

        alien.userData.isDodging = true;
        alien.position.z += dodgeOffset;

        setTimeout(() => {
          if (!aliens.includes(alien)) return;
          alien.position.z = alien.userData.originalZ;
          alien.userData.isDodging = false;

          setTimeout(tryDodge, 2000 + Math.random() * 3000);
        }, dodgeDuration);
      };

      setTimeout(tryDodge, 1000 + Math.random() * 2000);

      const shootRandomly = () => {
        if (gameOver || !aliens.includes(alien)) return;
        alienShoot(alien);
        const nextShotIn = 3000 + Math.random() * 4000;
        setTimeout(shootRandomly, nextShotIn);
      };
      setTimeout(shootRandomly, Math.random() * 2000 + 1000);
    }
  }

  console.log("Aliens reset for phase " + enemyPhase);
}

prefillLeaderboard();
updateLeaderboard();

//debug
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

document.addEventListener("mousedown", (event) => {
  if (event.button === 2) {
    currentLevel = (currentLevel % 3) + 1;
    setCameraView();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p") {
    currentLevel = (currentLevel % 3) + 1;
    setCameraView();
  }
});

