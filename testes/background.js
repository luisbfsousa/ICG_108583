import * as THREE from 'three';

let uniforms; 

export async function renderCustomShader() {
  const fragmentShaderCode = await fetch('/shaders/space.glsl')
    .then(response => response.text())
    .catch(error => console.error('Error loading fragment shader:', error));

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000), 0);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.PlaneGeometry(2, 2);

  uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_joystick: { value: new THREE.Vector2(0.5, 0.5) }
  };

  const customMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: fragmentShaderCode,
    transparent: true
  });

  const mesh = new THREE.Mesh(geometry, customMaterial);
  scene.add(mesh);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    uniforms.u_time.value += clock.getDelta();
    renderer.render(scene, camera);
  }
  animate();

  return {
    updateJoystick: (vec2) => {
      uniforms.u_joystick.value.copy(vec2);
    }
  };
}
