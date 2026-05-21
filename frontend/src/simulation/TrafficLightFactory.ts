import * as THREE from 'three';
import { SignalState } from './types';

export class TrafficLightFactory {
  static createTrafficLight(): THREE.Group {
    const group = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 6, 12);
    const poleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.6,
      roughness: 0.4,
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 3;
    pole.castShadow = true;
    group.add(pole);

    // Housing
    const housingGeometry = new THREE.BoxGeometry(1, 3.5, 1);
    const housingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      metalness: 0.5,
      roughness: 0.5,
    });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.y = 7.5;
    housing.castShadow = true;
    group.add(housing);

    // Visor top
    const visorGeometry = new THREE.BoxGeometry(1.3, 0.1, 0.6);
    const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 9.3, 0.3);
    visor.rotation.x = -0.3;
    group.add(visor);

    // Lights (Red, Yellow, Green from top to bottom)
    const lightPositions = [8.5, 7.5, 6.5];
    const lightColors = ['red', 'yellow', 'green'];

    lightPositions.forEach((y, index) => {
      // Light socket
      const socketGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
      const socketMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
      const socket = new THREE.Mesh(socketGeometry, socketMaterial);
      socket.rotation.x = Math.PI / 2;
      socket.position.set(0, y, 0.45);
      group.add(socket);

      // Light bulb
      const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const lightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        emissive: 0x000000,
        emissiveIntensity: 0,
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(0, y, 0.55);
      light.name = `light_${lightColors[index]}`;
      group.add(light);
    });

    return group;
  }

  static updateLightState(trafficLight: THREE.Group, state: SignalState): void {
    const lightColors: Record<string, { on: number; emissive: number }> = {
      red: { on: 0xff3333, emissive: 0xff0000 },
      yellow: { on: 0xffff33, emissive: 0xffff00 },
      green: { on: 0x33ff33, emissive: 0x00ff00 },
    };

    const allLights = ['red', 'yellow', 'green'];
    
    allLights.forEach(lightName => {
      const light = trafficLight.getObjectByName(`light_${lightName}`) as THREE.Mesh;
      if (light && light.material instanceof THREE.MeshStandardMaterial) {
        const isActive = lightName === state;
        const colors = lightColors[lightName];
        
        light.material.color.setHex(isActive ? colors.on : 0x333333);
        light.material.emissive.setHex(isActive ? colors.emissive : 0x000000);
        light.material.emissiveIntensity = isActive ? 1 : 0;
      }
    });
  }
}
