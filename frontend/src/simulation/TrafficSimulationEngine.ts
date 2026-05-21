import * as THREE from 'three';
import { gsap } from 'gsap';
import { 
  SimulationState, 
  SignalId, 
  SignalState, 
  Vehicle, 
  VehicleType, 
  LaneDirection,
  TIMING_CONFIG 
} from './types';
import { VehicleFactory } from './VehicleFactory';
import { TrafficLightFactory } from './TrafficLightFactory';
import { PathGenerator } from './PathGenerator';
import { EnvironmentBuilder } from './EnvironmentBuilder';

export class TrafficSimulationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  private lastSpawnTime: number = 0;
  private vehicleIdCounter: number = 0;

  state: SimulationState = {
    isRunning: false,
    autoCycle: true,
    currentSignal: 'A',
    vehicleDensity: 50,
    speedMultiplier: 1,
    signals: {
      A: { id: 'A', state: 'green', position: new THREE.Vector3(8, 0, -15), rotation: 0 },
      B: { id: 'B', state: 'red', position: new THREE.Vector3(15, 0, 8), rotation: -Math.PI / 2 },
      C: { id: 'C', state: 'red', position: new THREE.Vector3(-15, 0, -8), rotation: Math.PI / 2 },
    },
    vehicles: [],
    timeRemaining: TIMING_CONFIG.green,
    currentPhase: 'green',
  };

  private cycleTimeline: gsap.core.Timeline | null = null;
  private onStateChange: ((state: SimulationState) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Ensure container has dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0f0f23, 0.008);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height || 1,
      0.1,
      1000
    );
    this.camera.position.set(50, 60, 50);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.buildEnvironment();
    this.createTrafficLights();
    this.setupControls();
    this.handleResize();

    // Initial render to show the scene immediately
    this.renderer.render(this.scene, this.camera);

    window.addEventListener('resize', () => this.handleResize());
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    // Main directional light (moonlight effect)
    const moonLight = new THREE.DirectionalLight(0x8888ff, 0.6);
    moonLight.position.set(50, 100, 50);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 200;
    moonLight.shadow.camera.left = -80;
    moonLight.shadow.camera.right = 80;
    moonLight.shadow.camera.top = 80;
    moonLight.shadow.camera.bottom = -80;
    this.scene.add(moonLight);

    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xffaa44, 0.3);
    fillLight.position.set(-30, 40, -30);
    this.scene.add(fillLight);

    // Hemisphere light for natural feel
    const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x224422, 0.4);
    this.scene.add(hemiLight);
  }

  private buildEnvironment(): void {
    EnvironmentBuilder.buildEnvironment(this.scene);
  }

  private createTrafficLights(): void {
    Object.values(this.state.signals).forEach(signal => {
      const trafficLight = TrafficLightFactory.createTrafficLight();
      trafficLight.position.copy(signal.position);
      trafficLight.rotation.y = signal.rotation;
      signal.mesh = trafficLight;
      this.scene.add(trafficLight);
      TrafficLightFactory.updateLightState(trafficLight, signal.state);
    });
  }

  private setupControls(): void {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      spherical.theta -= deltaX * 0.01;
      spherical.phi = Math.max(0.3, Math.min(1.4, spherical.phi + deltaY * 0.01));

      this.camera.position.setFromSpherical(spherical);
      this.camera.lookAt(0, 0, 0);

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      spherical.radius = Math.max(30, Math.min(150, spherical.radius + e.deltaY * 0.1));
      this.camera.position.setFromSpherical(spherical);
      this.camera.lookAt(0, 0, 0);
    }, { passive: false });
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setStateChangeCallback(callback: (state: SimulationState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  start(): void {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.clock.start();
    
    if (this.state.autoCycle) {
      this.startAutoCycle();
    }
    
    this.animate();
    this.notifyStateChange();
  }

  pause(): void {
    this.state.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.cycleTimeline) {
      this.cycleTimeline.pause();
    }
    this.notifyStateChange();
  }

  resume(): void {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    if (this.cycleTimeline) {
      this.cycleTimeline.resume();
    }
    this.animate();
    this.notifyStateChange();
  }

  setAutoCycle(enabled: boolean): void {
    this.state.autoCycle = enabled;
    
    if (enabled && this.state.isRunning) {
      this.startAutoCycle();
    } else if (!enabled && this.cycleTimeline) {
      this.cycleTimeline.kill();
      this.cycleTimeline = null;
    }
    
    this.notifyStateChange();
  }

  private startAutoCycle(): void {
    if (this.cycleTimeline) {
      this.cycleTimeline.kill();
    }

    this.cycleTimeline = gsap.timeline({ repeat: -1 });
    
    const signals: SignalId[] = ['A', 'B', 'C'];
    
    signals.forEach((signalId, index) => {
      // Green phase
      this.cycleTimeline!.call(() => {
        this.setSignalState(signalId, 'green');
        this.state.currentSignal = signalId;
        this.state.currentPhase = 'green';
        this.state.timeRemaining = TIMING_CONFIG.green;
        this.notifyStateChange();
      }, [], index === 0 ? 0 : undefined);

      this.cycleTimeline!.to(this.state, {
        timeRemaining: 0,
        duration: TIMING_CONFIG.green,
        ease: 'none',
        onUpdate: () => this.notifyStateChange(),
      });

      // Yellow phase
      this.cycleTimeline!.call(() => {
        this.setSignalState(signalId, 'yellow');
        this.state.currentPhase = 'yellow';
        this.state.timeRemaining = TIMING_CONFIG.yellow;
        this.notifyStateChange();
      });

      this.cycleTimeline!.to(this.state, {
        timeRemaining: 0,
        duration: TIMING_CONFIG.yellow,
        ease: 'none',
        onUpdate: () => this.notifyStateChange(),
      });

      // Red phase (brief transition)
      this.cycleTimeline!.call(() => {
        this.setSignalState(signalId, 'red');
        this.state.currentPhase = 'red';
        this.notifyStateChange();
      });

      this.cycleTimeline!.to({}, { duration: 0.5 });
    });
  }

  setManualSignal(signalId: SignalId): void {
    if (!this.state.autoCycle) {
      // Set selected signal to green, others to red
      Object.keys(this.state.signals).forEach(id => {
        const state: SignalState = id === signalId ? 'green' : 'red';
        this.setSignalState(id as SignalId, state);
      });
      this.state.currentSignal = signalId;
      this.state.currentPhase = 'green';
      this.notifyStateChange();
    }
  }

  private setSignalState(signalId: SignalId, state: SignalState): void {
    const signal = this.state.signals[signalId];
    signal.state = state;
    
    if (signal.mesh) {
      TrafficLightFactory.updateLightState(signal.mesh, state);
    }
  }

  setVehicleDensity(density: number): void {
    this.state.vehicleDensity = Math.max(0, Math.min(100, density));
    this.notifyStateChange();
  }

  setSpeedMultiplier(multiplier: number): void {
    this.state.speedMultiplier = Math.max(0.1, Math.min(3, multiplier));
    this.notifyStateChange();
  }

  private spawnVehicle(): void {
    const vehicleTypes: VehicleType[] = ['car', 'car', 'car', 'bike', 'auto', 'bus'];
    const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    
    const signals: SignalId[] = ['A', 'B', 'C'];
    const signalId = signals[Math.floor(Math.random() * signals.length)];
    
    const lanes: LaneDirection[] = ['straight', 'left', 'right'];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    const mesh = VehicleFactory.createVehicle(type);
    const path = PathGenerator.generatePath(signalId, lane);
    
    const baseSpeed = type === 'bus' ? 0.003 : type === 'bike' ? 0.006 : 0.005;
    
    const vehicle: Vehicle = {
      id: `vehicle_${this.vehicleIdCounter++}`,
      type,
      mesh,
      path,
      progress: 0,
      speed: baseSpeed,
      baseSpeed,
      lane,
      signalId,
      stopped: false,
      stopPosition: PathGenerator.getStopPosition(signalId),
    };

    // Initial position
    const startPoint = path.getPointAt(0);
    mesh.position.copy(startPoint);
    
    // Initial rotation
    const tangent = path.getTangentAt(0);
    mesh.lookAt(startPoint.clone().add(tangent));

    this.scene.add(mesh);
    this.state.vehicles.push(vehicle);
  }

  private updateVehicles(delta: number): void {
    const vehiclesToRemove: string[] = [];

    this.state.vehicles.forEach(vehicle => {
      const signal = this.state.signals[vehicle.signalId];
      const shouldStop = signal.state === 'red' && 
                         vehicle.progress < vehicle.stopPosition + 0.05 &&
                         vehicle.progress > vehicle.stopPosition - 0.1;

      if (shouldStop && vehicle.progress >= vehicle.stopPosition - 0.02) {
        vehicle.stopped = true;
        vehicle.speed = Math.max(0, vehicle.speed - 0.001);
      } else {
        vehicle.stopped = false;
        const targetSpeed = vehicle.baseSpeed * this.state.speedMultiplier;
        vehicle.speed = Math.min(targetSpeed, vehicle.speed + 0.0005);
      }

      if (!vehicle.stopped || vehicle.speed > 0) {
        vehicle.progress += vehicle.speed * delta * 60;

        if (vehicle.progress >= 1) {
          vehiclesToRemove.push(vehicle.id);
          this.scene.remove(vehicle.mesh);
          return;
        }

        const position = vehicle.path.getPointAt(vehicle.progress);
        vehicle.mesh.position.copy(position);

        // Smooth rotation
        if (vehicle.progress < 0.99) {
          const tangent = vehicle.path.getTangentAt(vehicle.progress);
          const lookAtPoint = position.clone().add(tangent);
          vehicle.mesh.lookAt(lookAtPoint);
        }
      }
    });

    // Remove completed vehicles
    this.state.vehicles = this.state.vehicles.filter(v => !vehiclesToRemove.includes(v.id));
  }

  private animate(): void {
    if (!this.state.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Spawn vehicles based on density
    const spawnInterval = 3 - (this.state.vehicleDensity / 100) * 2.5;
    if (this.clock.getElapsedTime() - this.lastSpawnTime > spawnInterval && 
        this.state.vehicles.length < 30) {
      this.spawnVehicle();
      this.lastSpawnTime = this.clock.getElapsedTime();
    }

    this.updateVehicles(delta);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.pause();
    
    if (this.cycleTimeline) {
      this.cycleTimeline.kill();
    }

    this.state.vehicles.forEach(vehicle => {
      this.scene.remove(vehicle.mesh);
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    
    window.removeEventListener('resize', () => this.handleResize());
  }
}

