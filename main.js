/*
  3D car driving game with Three.js.
  - Keyboard + touch controls
  - Third-person camera
  - Collision with static obstacles
  - Distance score + speed UI
*/

(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91c4ff);
  scene.fog = new THREE.Fog(0x91c4ff, 80, 450);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 9, -14);

  // Lighting.
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334455, 0.9);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  scene.add(sun);

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x4f8f4f, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Road network.
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);

  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 1.0 });
  const laneMaterial = new THREE.MeshStandardMaterial({ color: 0xfff3a1, emissive: 0x302810 });

  function addRoad(x, z, width, length, horizontal = false) {
    const geom = horizontal ? new THREE.BoxGeometry(length, 0.2, width) : new THREE.BoxGeometry(width, 0.2, length);
    const road = new THREE.Mesh(geom, roadMaterial);
    road.position.set(x, 0.1, z);
    road.receiveShadow = true;
    roadGroup.add(road);

    const stripeGeom = horizontal
      ? new THREE.BoxGeometry(length * 0.9, 0.03, 0.25)
      : new THREE.BoxGeometry(0.25, 0.03, length * 0.9);
    const stripe = new THREE.Mesh(stripeGeom, laneMaterial);
    stripe.position.set(x, 0.22, z);
    roadGroup.add(stripe);
  }

  addRoad(0, 0, 28, 360);
  addRoad(0, 0, 28, 360, true);
  addRoad(160, 0, 24, 300);
  addRoad(-160, 0, 24, 300);
  addRoad(0, 160, 24, 300, true);
  addRoad(0, -160, 24, 300, true);

  // Car (simple built-in model for portability).
  const car = new THREE.Group();
  scene.add(car);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.85, 4.2),
    new THREE.MeshStandardMaterial({ color: 0xd72e2e, metalness: 0.3, roughness: 0.45 })
  );
  body.position.y = 0.9;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.7, 2),
    new THREE.MeshStandardMaterial({ color: 0x9ec4ff, metalness: 0.1, roughness: 0.2 })
  );
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  function createWheel(x, z) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.42, 20),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.45, z);
    wheel.castShadow = true;
    car.add(wheel);
    return wheel;
  }

  const wheels = [
    createWheel(-1.1, 1.45),
    createWheel(1.1, 1.45),
    createWheel(-1.1, -1.45),
    createWheel(1.1, -1.45),
  ];

  // City props and collision objects.
  const colliders = [];
  const environment = new THREE.Group();
  scene.add(environment);

  function addColliderBox(mesh) {
    mesh.userData.collider = new THREE.Box3().setFromObject(mesh);
    colliders.push(mesh);
    environment.add(mesh);
  }

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95 });
  const buildMats = [
    new THREE.MeshStandardMaterial({ color: 0x8f9bb3, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xaa8f81, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x7f9681, roughness: 0.9 }),
  ];

  // Perimeter walls.
  [
    [0, 3, 245, 5, 6, 1],
    [0, 3, -245, 5, 6, 1],
    [245, 3, 0, 1, 6, 5],
    [-245, 3, 0, 1, 6, 5],
  ].forEach(([x, y, z, sx, sy, sz]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(98 * sx, sy, 98 * sz), wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    addColliderBox(wall);
  });

  // Buildings along roads.
  const rng = (min, max) => Math.random() * (max - min) + min;
  for (let i = 0; i < 90; i += 1) {
    const h = rng(7, 25);
    const w = rng(8, 20);
    const d = rng(8, 20);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      buildMats[Math.floor(Math.random() * buildMats.length)]
    );

    const laneChoice = Math.floor(Math.random() * 4);
    const spread = rng(-220, 220);
    const offset = rng(20, 70) * (Math.random() > 0.5 ? 1 : -1);

    if (laneChoice === 0) building.position.set(spread, h / 2, offset);
    if (laneChoice === 1) building.position.set(offset, h / 2, spread);
    if (laneChoice === 2) building.position.set(spread, h / 2, offset + 160);
    if (laneChoice === 3) building.position.set(offset + 160, h / 2, spread);

    building.castShadow = true;
    building.receiveShadow = true;
    addColliderBox(building);
  }

  // Input.
  const input = { up: false, down: false, left: false, right: false, brake: false };

  const keyMap = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    Space: "brake",
  };

  window.addEventListener("keydown", (e) => {
    const action = keyMap[e.code];
    if (action) {
      input[action] = true;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const action = keyMap[e.code];
    if (action) {
      input[action] = false;
      e.preventDefault();
    }
  });

  // Touch controls.
  document.querySelectorAll(".touch").forEach((btn) => {
    const action = btn.dataset.key;
    const press = (value) => {
      input[action] = value;
      btn.style.background = value ? "rgba(77,216,255,.55)" : "rgba(10,10,18,.75)";
    };
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      press(true);
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      press(false);
    });
    btn.addEventListener("touchcancel", () => press(false));
  });

  // Vehicle physics.
  const state = {
    speed: 0,
    maxSpeed: 34,
    acceleration: 24,
    reverseAcceleration: 14,
    friction: 7,
    brakePower: 42,
    steerStrength: 2.2,
    steeringDamp: 6,
    steering: 0,
    distance: 0,
  };

  const speedEl = document.getElementById("speed");
  const scoreEl = document.getElementById("score");

  const carHalfSize = new THREE.Vector3(1.2, 0.9, 2.3);
  const carBox = new THREE.Box3();
  const previousPos = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const moveVector = new THREE.Vector3();

  function updateCarBox() {
    carBox.setFromCenterAndSize(car.position.clone().setY(1), carHalfSize.clone().multiplyScalar(2));
  }

  function collides() {
    for (const obstacle of colliders) {
      obstacle.userData.collider.setFromObject(obstacle);
      if (carBox.intersectsBox(obstacle.userData.collider)) return true;
    }
    return false;
  }

  function resetGame() {
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    state.speed = 0;
    state.distance = 0;
    state.steering = 0;
    scoreEl.textContent = "Distance: 0 m";
    speedEl.textContent = "Speed: 0 km/h";
  }

  document.getElementById("restartBtn").addEventListener("click", resetGame);

  resetGame();

  // Camera smoothing vectors.
  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookAtPos = new THREE.Vector3();

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min((now - previousTime) / 1000, 0.033);
    previousTime = now;

    // Acceleration / braking.
    if (input.up) state.speed += state.acceleration * dt;
    if (input.down) state.speed -= state.reverseAcceleration * dt;

    if (!input.up && !input.down) {
      const sign = Math.sign(state.speed);
      const mag = Math.max(0, Math.abs(state.speed) - state.friction * dt);
      state.speed = mag * sign;
    }

    if (input.brake) {
      const sign = Math.sign(state.speed);
      const mag = Math.max(0, Math.abs(state.speed) - state.brakePower * dt);
      state.speed = mag * sign;
    }

    state.speed = THREE.MathUtils.clamp(state.speed, -state.maxSpeed * 0.45, state.maxSpeed);

    // Steering scales with speed so parked steering is reduced.
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const targetSteer = steerInput * Math.min(1, Math.abs(state.speed) / 6);
    state.steering = THREE.MathUtils.damp(state.steering, targetSteer, state.steeringDamp, dt);
    car.rotation.y += state.steering * state.steerStrength * dt * Math.sign(state.speed || 1);

    // Move forward in the local facing direction.
    previousPos.copy(car.position);
    forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    moveVector.copy(forward).multiplyScalar(state.speed * dt);
    car.position.add(moveVector);

    // Collision response: rewind movement and cancel speed if hit.
    updateCarBox();
    if (collides()) {
      car.position.copy(previousPos);
      state.speed *= -0.16;
      updateCarBox();
    }

    // Wheel spin animation.
    const wheelRotation = (state.speed * dt) / 0.45;
    wheels.forEach((wheel) => {
      wheel.rotation.x += wheelRotation;
    });

    // Score from traveled distance while moving.
    state.distance += moveVector.length();

    speedEl.textContent = `Speed: ${Math.round(Math.abs(state.speed) * 3.6)} km/h`;
    scoreEl.textContent = `Distance: ${Math.floor(state.distance)} m`;

    // Third-person follow camera with smoothing.
    camTarget.set(0, 5.5, -11).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    camPos.copy(car.position).add(camTarget);
    camera.position.lerp(camPos, 1 - Math.exp(-dt * 8));

    lookAtPos.copy(car.position).setY(1.2);
    camera.lookAt(lookAtPos);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
