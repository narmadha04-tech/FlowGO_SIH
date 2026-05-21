import * as THREE from 'three';

export class EnvironmentBuilder {
  static buildEnvironment(scene: THREE.Scene): void {
    this.createSkybox(scene);
    this.createGround(scene);
    this.createRoads(scene);
    this.createZebraCrossings(scene);
    this.createBuildings(scene);
    this.createStreetLamps(scene);
    this.createTrees(scene);
  }

  private static createSkybox(scene: THREE.Scene): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a1a3e) },
        bottomColor: { value: new THREE.Color(0x0f0f23) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 400 + Math.random() * 50;
      
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(radius * Math.cos(phi));
      starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  private static createGround(scene: THREE.Scene): void {
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3d1a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  private static createRoads(scene: THREE.Scene): void {
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Main intersection
    const intersectionGeometry = new THREE.PlaneGeometry(24, 24);
    const intersection = new THREE.Mesh(intersectionGeometry, roadMaterial);
    intersection.rotation.x = -Math.PI / 2;
    intersection.receiveShadow = true;
    scene.add(intersection);

    // Road segments
    const roadWidth = 12;
    const roadLength = 100;

    // North-South road
    const nsRoadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
    
    const northRoad = new THREE.Mesh(nsRoadGeometry, roadMaterial);
    northRoad.rotation.x = -Math.PI / 2;
    northRoad.position.z = 62;
    northRoad.receiveShadow = true;
    scene.add(northRoad);

    const southRoad = new THREE.Mesh(nsRoadGeometry, roadMaterial);
    southRoad.rotation.x = -Math.PI / 2;
    southRoad.position.z = -62;
    southRoad.receiveShadow = true;
    scene.add(southRoad);

    // East-West road
    const ewRoadGeometry = new THREE.PlaneGeometry(roadLength, roadWidth);
    
    const eastRoad = new THREE.Mesh(ewRoadGeometry, roadMaterial);
    eastRoad.rotation.x = -Math.PI / 2;
    eastRoad.position.x = 62;
    eastRoad.receiveShadow = true;
    scene.add(eastRoad);

    const westRoad = new THREE.Mesh(ewRoadGeometry, roadMaterial);
    westRoad.rotation.x = -Math.PI / 2;
    westRoad.position.x = -62;
    westRoad.receiveShadow = true;
    scene.add(westRoad);

    // Road markings
    this.createRoadMarkings(scene);
  }

  private static createRoadMarkings(scene: THREE.Scene): void {
    const markingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.5,
    });

    const dashGeometry = new THREE.PlaneGeometry(0.3, 3);
    
    // North-South markings
    for (let z = 15; z < 100; z += 8) {
      const dashNorth = new THREE.Mesh(dashGeometry, markingMaterial);
      dashNorth.rotation.x = -Math.PI / 2;
      dashNorth.position.set(0, 0.01, z);
      scene.add(dashNorth);

      const dashSouth = new THREE.Mesh(dashGeometry, markingMaterial);
      dashSouth.rotation.x = -Math.PI / 2;
      dashSouth.position.set(0, 0.01, -z);
      scene.add(dashSouth);
    }

    // East-West markings
    const dashGeometryH = new THREE.PlaneGeometry(3, 0.3);
    for (let x = 15; x < 100; x += 8) {
      const dashEast = new THREE.Mesh(dashGeometryH, markingMaterial);
      dashEast.rotation.x = -Math.PI / 2;
      dashEast.position.set(x, 0.01, 0);
      scene.add(dashEast);

      const dashWest = new THREE.Mesh(dashGeometryH, markingMaterial);
      dashWest.rotation.x = -Math.PI / 2;
      dashWest.position.set(-x, 0.01, 0);
      scene.add(dashWest);
    }

    // Stop lines
    const stopLineGeometry = new THREE.PlaneGeometry(6, 0.5);
    const stopLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const stopLines = [
      { x: 3, z: -10, rotation: 0 },
      { x: -3, z: 10, rotation: 0 },
      { x: 10, z: 3, rotation: Math.PI / 2 },
      { x: -10, z: -3, rotation: Math.PI / 2 },
    ];

    stopLines.forEach(pos => {
      const stopLine = new THREE.Mesh(stopLineGeometry, stopLineMaterial);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.rotation.z = pos.rotation;
      stopLine.position.set(pos.x, 0.02, pos.z);
      scene.add(stopLine);
    });
  }

  private static createZebraCrossings(scene: THREE.Scene): void {
    const stripeGeometry = new THREE.PlaneGeometry(0.6, 4);
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // South crossing (Signal A approach)
    for (let i = -5; i <= 5; i += 1.2) {
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i, 0.02, -13);
      scene.add(stripe);
    }

    // East crossing (Signal B approach)
    const stripeGeometryV = new THREE.PlaneGeometry(4, 0.6);
    for (let i = -5; i <= 5; i += 1.2) {
      const stripe = new THREE.Mesh(stripeGeometryV, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(13, 0.02, i);
      scene.add(stripe);
    }

    // West crossing (Signal C approach)
    for (let i = -5; i <= 5; i += 1.2) {
      const stripe = new THREE.Mesh(stripeGeometryV, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-13, 0.02, i);
      scene.add(stripe);
    }

    // North crossing
    for (let i = -5; i <= 5; i += 1.2) {
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i, 0.02, 13);
      scene.add(stripe);
    }
  }

  private static createBuildings(scene: THREE.Scene): void {
    const buildingConfigs = [
      { x: 30, z: 30, width: 20, depth: 20, height: 25, color: 0x4a5568 },
      { x: -30, z: 30, width: 20, depth: 20, height: 35, color: 0x5a6878 },
      { x: 30, z: -30, width: 20, depth: 20, height: 30, color: 0x3a4558 },
      { x: -30, z: -30, width: 20, depth: 20, height: 40, color: 0x4a5568 },
      { x: 55, z: 30, width: 15, depth: 18, height: 45, color: 0x6a7888 },
      { x: -55, z: 30, width: 15, depth: 18, height: 50, color: 0x5a6878 },
      { x: 55, z: -30, width: 15, depth: 18, height: 35, color: 0x4a5568 },
      { x: -55, z: -30, width: 15, depth: 18, height: 55, color: 0x3a4558 },
      { x: 30, z: 55, width: 18, depth: 15, height: 40, color: 0x5a6878 },
      { x: -30, z: 55, width: 18, depth: 15, height: 30, color: 0x4a5568 },
      { x: 30, z: -55, width: 18, depth: 15, height: 45, color: 0x6a7888 },
      { x: -30, z: -55, width: 18, depth: 15, height: 35, color: 0x5a6878 },
    ];

    buildingConfigs.forEach(config => {
      this.createBuilding(scene, config.x, config.z, config.width, config.depth, config.height, config.color);
    });
  }

  private static createBuilding(
    scene: THREE.Scene, 
    x: number, 
    z: number, 
    width: number, 
    depth: number, 
    height: number, 
    color: number
  ): void {
    const buildingGroup = new THREE.Group();

    // Main structure
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.7,
      metalness: 0.3,
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);

    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffee88,
      emissive: 0xffee44,
      emissiveIntensity: 0.3,
    });

    const windowWidth = 1.5;
    const windowHeight = 2;
    const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
    const floorHeight = 4;
    const floors = Math.floor(height / floorHeight);

    for (let floor = 1; floor < floors; floor++) {
      const y = floor * floorHeight;
      
      for (let wx = -width / 2 + 3; wx < width / 2 - 2; wx += 3) {
        if (Math.random() > 0.3) {
          const windowFront = new THREE.Mesh(windowGeometry, windowMaterial);
          windowFront.position.set(wx, y, depth / 2 + 0.01);
          buildingGroup.add(windowFront);
        }

        if (Math.random() > 0.3) {
          const windowBack = new THREE.Mesh(windowGeometry, windowMaterial);
          windowBack.position.set(wx, y, -depth / 2 - 0.01);
          windowBack.rotation.y = Math.PI;
          buildingGroup.add(windowBack);
        }
      }

      for (let wz = -depth / 2 + 3; wz < depth / 2 - 2; wz += 3) {
        if (Math.random() > 0.3) {
          const windowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
          windowLeft.position.set(-width / 2 - 0.01, y, wz);
          windowLeft.rotation.y = -Math.PI / 2;
          buildingGroup.add(windowLeft);
        }

        if (Math.random() > 0.3) {
          const windowRight = new THREE.Mesh(windowGeometry, windowMaterial);
          windowRight.position.set(width / 2 + 0.01, y, wz);
          windowRight.rotation.y = Math.PI / 2;
          buildingGroup.add(windowRight);
        }
      }
    }

    buildingGroup.position.set(x, 0, z);
    scene.add(buildingGroup);
  }

  private static createStreetLamps(scene: THREE.Scene): void {
    const lampPositions = [
      { x: 8, z: -20 }, { x: -8, z: -20 },
      { x: 8, z: 20 }, { x: -8, z: 20 },
      { x: 20, z: 8 }, { x: 20, z: -8 },
      { x: -20, z: 8 }, { x: -20, z: -8 },
    ];

    lampPositions.forEach(pos => {
      this.createStreetLamp(scene, pos.x, pos.z);
    });
  }

  private static createStreetLamp(scene: THREE.Scene, x: number, z: number): void {
    const lampGroup = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.6,
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2.5;
    pole.castShadow = true;
    lampGroup.add(pole);

    // Arm
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const arm = new THREE.Mesh(armGeometry, poleMaterial);
    arm.position.set(0.5, 5, 0);
    arm.rotation.z = Math.PI / 2;
    lampGroup.add(arm);

    // Lamp head
    const headGeometry = new THREE.ConeGeometry(0.4, 0.5, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(1, 4.8, 0);
    head.rotation.z = Math.PI;
    lampGroup.add(head);

    // Light bulb
    const bulbGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 1,
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(1, 4.5, 0);
    lampGroup.add(bulb);

    // Point light
    const pointLight = new THREE.PointLight(0xffffcc, 0.5, 15);
    pointLight.position.set(1, 4.5, 0);
    pointLight.castShadow = true;
    lampGroup.add(pointLight);

    lampGroup.position.set(x, 0, z);
    scene.add(lampGroup);
  }

  private static createTrees(scene: THREE.Scene): void {
    const treePositions = [
      { x: 18, z: 25 }, { x: -18, z: 25 },
      { x: 18, z: -25 }, { x: -18, z: -25 },
      { x: 25, z: 18 }, { x: -25, z: 18 },
      { x: 25, z: -18 }, { x: -25, z: -18 },
    ];

    treePositions.forEach(pos => {
      this.createTree(scene, pos.x, pos.z);
    });
  }

  private static createTree(scene: THREE.Scene, x: number, z: number): void {
    const treeGroup = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    
    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 8), foliageMaterial);
    foliage1.position.y = 2.5;
    foliage1.castShadow = true;
    treeGroup.add(foliage1);

    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 8), foliageMaterial);
    foliage2.position.y = 3.5;
    foliage2.castShadow = true;
    treeGroup.add(foliage2);

    const foliage3 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 8), foliageMaterial);
    foliage3.position.y = 4.3;
    foliage3.castShadow = true;
    treeGroup.add(foliage3);

    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
  }
}

