// 3D Spinning Bitcoin Coin - Interactive with mouse/touch drag
(function() {
  const container = document.getElementById('bitcoin-coin');
  if (!container) return;

  // Three.js setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(200, 200);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Create Bitcoin logo texture using canvas
  function createBitcoinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw coin face background (Bitcoin orange)
    ctx.fillStyle = '#f7931a';
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle gradient for depth
    const gradient = ctx.createRadialGradient(200, 200, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 100, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();

    // Draw Bitcoin symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 300px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u20BF', 256, 270);

    return new THREE.CanvasTexture(canvas);
  }

  const bitcoinTexture = createBitcoinTexture();

  // Create coin - cylinder with textured top and bottom caps
  const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.15, 64);

  // Create materials array: side, top cap, bottom cap
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7931a,
    metalness: 0.7,
    roughness: 0.3,
  });

  const faceMaterial = new THREE.MeshStandardMaterial({
    map: bitcoinTexture,
    metalness: 0.6,
    roughness: 0.3,
  });

  // Apply materials: [side, top, bottom]
  const coin = new THREE.Mesh(coinGeometry, [sideMaterial, faceMaterial, faceMaterial]);
  // Position coin upright like a spinning quarter
  coin.rotation.z = Math.PI / 2;
  scene.add(coin);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0xf7931a, 0.3);
  backLight.position.set(-5, -5, -5);
  scene.add(backLight);

  // Interaction variables
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let momentum = { x: 0, y: 0 };

  // Mouse/Touch handlers
  const onStart = (e) => {
    isDragging = true;
    const pos = e.touches ? e.touches[0] : e;
    previousMousePosition = { x: pos.clientX, y: pos.clientY };
    momentum = { x: 0, y: 0 };
  };

  const onMove = (e) => {
    if (!isDragging) return;

    const pos = e.touches ? e.touches[0] : e;
    const deltaX = pos.clientX - previousMousePosition.x;
    const deltaY = pos.clientY - previousMousePosition.y;

    // Spin vertically (like a quarter) based on horizontal drag
    // and tilt based on vertical drag
    momentum.y = deltaX * 0.01;
    momentum.x = deltaY * 0.005;

    previousMousePosition = { x: pos.clientX, y: pos.clientY };
  };

  const onEnd = () => {
    isDragging = false;
  };

  // Event listeners
  container.addEventListener('mousedown', onStart);
  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseup', onEnd);
  container.addEventListener('mouseleave', onEnd);

  container.addEventListener('touchstart', onStart, { passive: true });
  container.addEventListener('touchmove', onMove, { passive: true });
  container.addEventListener('touchend', onEnd);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    if (!isDragging) {
      // Apply momentum with decay - no auto-spin
      momentum.x *= 0.95;
      momentum.y *= 0.95;
    }

    // Spin around Y axis (vertical spin like a quarter)
    coin.rotation.y += momentum.y;
    // Slight tilt on X for more dynamic feel
    coin.rotation.x += momentum.x;

    renderer.render(scene, camera);
  }

  animate();

  // Handle resize
  window.addEventListener('resize', () => {
    const size = Math.min(container.offsetWidth, 200);
    renderer.setSize(size, size);
  });
})();
