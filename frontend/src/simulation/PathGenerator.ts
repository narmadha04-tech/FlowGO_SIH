import * as THREE from 'three';
import { SignalId, LaneDirection } from './types';

const ROAD_WIDTH = 12;
const INTERSECTION_SIZE = 20;

export class PathGenerator {
  static generatePath(signalId: SignalId, lane: LaneDirection): THREE.CatmullRomCurve3 {
    const points = this.getPathPoints(signalId, lane);
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  private static getPathPoints(signalId: SignalId, lane: LaneDirection): THREE.Vector3[] {
    const offset = ROAD_WIDTH / 4;
    const far = 80;
    const near = INTERSECTION_SIZE / 2;
    const turnRadius = 8;

    switch (signalId) {
      case 'A': // Coming from South (negative Z)
        return this.getSouthPaths(lane, offset, far, near, turnRadius);
      case 'B': // Coming from East (positive X)
        return this.getEastPaths(lane, offset, far, near, turnRadius);
      case 'C': // Coming from West (negative X)
        return this.getWestPaths(lane, offset, far, near, turnRadius);
      default:
        return [];
    }
  }

  private static getSouthPaths(
    lane: LaneDirection, 
    offset: number, 
    far: number, 
    near: number, 
    turnRadius: number
  ): THREE.Vector3[] {
    switch (lane) {
      case 'straight':
        return [
          new THREE.Vector3(offset, 0, -far),
          new THREE.Vector3(offset, 0, -near),
          new THREE.Vector3(offset, 0, 0),
          new THREE.Vector3(offset, 0, near),
          new THREE.Vector3(offset, 0, far),
        ];
      case 'left':
        return [
          new THREE.Vector3(offset * 2, 0, -far),
          new THREE.Vector3(offset * 2, 0, -near),
          new THREE.Vector3(offset * 2, 0, -turnRadius),
          new THREE.Vector3(offset, 0, -turnRadius / 2),
          new THREE.Vector3(-turnRadius / 2, 0, -offset),
          new THREE.Vector3(-turnRadius, 0, offset * 2),
          new THREE.Vector3(-near, 0, offset * 2),
          new THREE.Vector3(-far, 0, offset * 2),
        ];
      case 'right':
        return [
          new THREE.Vector3(-offset, 0, -far),
          new THREE.Vector3(-offset, 0, -near),
          new THREE.Vector3(-offset, 0, -turnRadius),
          new THREE.Vector3(turnRadius / 2, 0, -offset),
          new THREE.Vector3(turnRadius, 0, -offset * 2),
          new THREE.Vector3(near, 0, -offset * 2),
          new THREE.Vector3(far, 0, -offset * 2),
        ];
      default:
        return [];
    }
  }

  private static getEastPaths(
    lane: LaneDirection, 
    offset: number, 
    far: number, 
    near: number, 
    turnRadius: number
  ): THREE.Vector3[] {
    switch (lane) {
      case 'straight':
        return [
          new THREE.Vector3(far, 0, offset),
          new THREE.Vector3(near, 0, offset),
          new THREE.Vector3(0, 0, offset),
          new THREE.Vector3(-near, 0, offset),
          new THREE.Vector3(-far, 0, offset),
        ];
      case 'left':
        return [
          new THREE.Vector3(far, 0, offset * 2),
          new THREE.Vector3(near, 0, offset * 2),
          new THREE.Vector3(turnRadius, 0, offset * 2),
          new THREE.Vector3(turnRadius / 2, 0, offset),
          new THREE.Vector3(offset, 0, turnRadius / 2),
          new THREE.Vector3(offset * 2, 0, turnRadius),
          new THREE.Vector3(offset * 2, 0, near),
          new THREE.Vector3(offset * 2, 0, far),
        ];
      case 'right':
        return [
          new THREE.Vector3(far, 0, -offset),
          new THREE.Vector3(near, 0, -offset),
          new THREE.Vector3(turnRadius, 0, -offset),
          new THREE.Vector3(turnRadius / 2, 0, -offset * 2),
          new THREE.Vector3(offset, 0, -turnRadius),
          new THREE.Vector3(offset * 2, 0, -near),
          new THREE.Vector3(offset * 2, 0, -far),
        ];
      default:
        return [];
    }
  }

  private static getWestPaths(
    lane: LaneDirection, 
    offset: number, 
    far: number, 
    near: number, 
    turnRadius: number
  ): THREE.Vector3[] {
    switch (lane) {
      case 'straight':
        return [
          new THREE.Vector3(-far, 0, -offset),
          new THREE.Vector3(-near, 0, -offset),
          new THREE.Vector3(0, 0, -offset),
          new THREE.Vector3(near, 0, -offset),
          new THREE.Vector3(far, 0, -offset),
        ];
      case 'left':
        return [
          new THREE.Vector3(-far, 0, -offset * 2),
          new THREE.Vector3(-near, 0, -offset * 2),
          new THREE.Vector3(-turnRadius, 0, -offset * 2),
          new THREE.Vector3(-turnRadius / 2, 0, -offset),
          new THREE.Vector3(-offset, 0, -turnRadius / 2),
          new THREE.Vector3(-offset * 2, 0, -turnRadius),
          new THREE.Vector3(-offset * 2, 0, -near),
          new THREE.Vector3(-offset * 2, 0, -far),
        ];
      case 'right':
        return [
          new THREE.Vector3(-far, 0, offset),
          new THREE.Vector3(-near, 0, offset),
          new THREE.Vector3(-turnRadius, 0, offset),
          new THREE.Vector3(-turnRadius / 2, 0, offset * 2),
          new THREE.Vector3(-offset, 0, turnRadius),
          new THREE.Vector3(-offset * 2, 0, near),
          new THREE.Vector3(-offset * 2, 0, far),
        ];
      default:
        return [];
    }
  }

  static getStopPosition(signalId: SignalId): number {
    // Returns the progress value (0-1) where vehicles should stop
    switch (signalId) {
      case 'A':
        return 0.15;
      case 'B':
        return 0.15;
      case 'C':
        return 0.15;
      default:
        return 0.15;
    }
  }
}

