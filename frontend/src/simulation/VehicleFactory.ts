import * as THREE from 'three';
import { VehicleType, VEHICLE_COLORS, VEHICLE_DIMENSIONS } from './types';

export class VehicleFactory {
  static createVehicle(type: VehicleType): THREE.Group {
    const group = new THREE.Group();
    const dimensions = VEHICLE_DIMENSIONS[type];
    const colors = VEHICLE_COLORS[type];
    const color = colors[Math.floor(Math.random() * colors.length)];

    switch (type) {
      case 'car':
        return this.createCar(group, color, dimensions);
      case 'bike':
        return this.createBike(group, color, dimensions);
      case 'auto':
        return this.createAuto(group, color, dimensions);
      case 'bus':
        return this.createBus(group, color, dimensions);
      default:
        return this.createCar(group, color, dimensions);
    }
  }

  private static createCar(
    group: THREE.Group, 
    color: number, 
    dims: { length: number; width: number; height: number }
  ): THREE.Group {
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(dims.length, dims.height * 0.6, dims.width);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.6,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dims.height * 0.3;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinGeometry = new THREE.BoxGeometry(dims.length * 0.5, dims.height * 0.4, dims.width * 0.9);
    const cabinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      metalness: 0.8,
      roughness: 0.2,
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(-dims.length * 0.1, dims.height * 0.7, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.8,
    });

    const wheelPositions = [
      [-dims.length * 0.35, 0.4, dims.width * 0.5],
      [-dims.length * 0.35, 0.4, -dims.width * 0.5],
      [dims.length * 0.35, 0.4, dims.width * 0.5],
      [dims.length * 0.35, 0.4, -dims.width * 0.5],
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
    });

    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    });

    [0.6, -0.6].forEach(z => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(dims.length * 0.48, dims.height * 0.3, z);
      group.add(headlight);
    });

    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.3);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    });

    [0.6, -0.6].forEach(z => {
      const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
      taillight.position.set(-dims.length * 0.48, dims.height * 0.3, z);
      group.add(taillight);
    });

    return group;
  }

  private static createBike(
    group: THREE.Group, 
    color: number, 
    dims: { length: number; width: number; height: number }
  ): THREE.Group {
    // Frame
    const frameGeometry = new THREE.BoxGeometry(dims.length * 0.8, dims.height * 0.3, dims.width * 0.5);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.7,
      roughness: 0.3,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = dims.height * 0.5;
    frame.castShadow = true;
    group.add(frame);

    // Wheels
    const wheelGeometry = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    [-0.7, 0.7].forEach(x => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(x, 0.35, 0);
      wheel.castShadow = true;
      group.add(wheel);
    });

    // Rider (simplified - using cylinder instead of capsule)
    const riderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
    const riderMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const rider = new THREE.Mesh(riderGeometry, riderMaterial);
    rider.position.set(0, dims.height * 1.1, 0);
    rider.castShadow = true;
    group.add(rider);

    // Headlight
    const headlightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    });
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(dims.length * 0.45, dims.height * 0.6, 0);
    group.add(headlight);

    return group;
  }

  private static createAuto(
    group: THREE.Group, 
    color: number, 
    dims: { length: number; width: number; height: number }
  ): THREE.Group {
    // Body
    const bodyGeometry = new THREE.BoxGeometry(dims.length, dims.height * 0.6, dims.width);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.4,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dims.height * 0.5;
    body.castShadow = true;
    group.add(body);

    // Canopy
    const canopyGeometry = new THREE.ConeGeometry(dims.width * 0.7, dims.height * 0.5, 4);
    const canopyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      metalness: 0.3,
      roughness: 0.7,
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(-dims.length * 0.1, dims.height * 1.1, 0);
    canopy.rotation.y = Math.PI / 4;
    canopy.castShadow = true;
    group.add(canopy);

    // Wheels (3 wheels for auto-rickshaw)
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const wheelPositions = [
      [dims.length * 0.4, 0.3, 0],
      [-dims.length * 0.35, 0.3, dims.width * 0.45],
      [-dims.length * 0.35, 0.3, -dims.width * 0.45],
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
    });

    return group;
  }

  private static createBus(
    group: THREE.Group, 
    color: number, 
    dims: { length: number; width: number; height: number }
  ): THREE.Group {
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(dims.length, dims.height, dims.width);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.3,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dims.height * 0.6;
    body.castShadow = true;
    group.add(body);

    // Windows
    const windowGeometry = new THREE.BoxGeometry(dims.length * 0.9, dims.height * 0.4, dims.width * 0.02);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87ceeb,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7,
    });

    [dims.width * 0.51, -dims.width * 0.51].forEach(z => {
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(0, dims.height * 0.85, z);
      group.add(window);
    });

    // Wheels (6 wheels)
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const wheelPositions = [
      [-dims.length * 0.35, 0.5, dims.width * 0.5],
      [-dims.length * 0.35, 0.5, -dims.width * 0.5],
      [0, 0.5, dims.width * 0.5],
      [0, 0.5, -dims.width * 0.5],
      [dims.length * 0.35, 0.5, dims.width * 0.5],
      [dims.length * 0.35, 0.5, -dims.width * 0.5],
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
    });

    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    });

    [0.8, -0.8].forEach(z => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(dims.length * 0.48, dims.height * 0.3, z);
      group.add(headlight);
    });

    return group;
  }
}

