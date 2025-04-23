import * as THREE from 'three';

export class PixelArt {
  constructor(coordsPos1, coordsPos2, pixelSize, pixelSpacing, color, animationSpeed = 1000, animate = true) {
    this.mesh = new THREE.Group();
    this.pixels = [];
    this.animationSpeed = animationSpeed;
    this.animate = animate;
    this.currentFrame = 0;
    this.frames = [coordsPos1, coordsPos2];
    this.lastFrameTime = 0;
    this.pixelSize = pixelSize;
    this.pixelSpacing = pixelSpacing;
    this.color = color;
    
    this.createPixels(coordsPos1, pixelSize, pixelSpacing, color);
    
    if (this.animate) {
      this.animatePixels();
    }
  }

  createPixels(coords, pixelSize, pixelSpacing, color) {
    this.mesh.children = [];
    this.pixels = [];
    
    coords.forEach(coord => {
      const geometry = new THREE.BoxGeometry(pixelSize, pixelSize, pixelSize);
      const material = new THREE.MeshStandardMaterial({ color });
      const pixel = new THREE.Mesh(geometry, material);
      
      pixel.position.x = coord.x * (pixelSize + pixelSpacing);
      pixel.position.y = -coord.y * (pixelSize + pixelSpacing);
      
      this.mesh.add(pixel);
      this.pixels.push(pixel);
    });
  }

  animatePixels() {
    const now = Date.now();
    if (now - this.lastFrameTime > this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.createPixels(this.frames[this.currentFrame], this.pixelSize, this.pixelSpacing, this.color);
      this.lastFrameTime = now;
    }
    
    if (this.animate) {
      requestAnimationFrame(() => this.animatePixels());
    }
  }
}