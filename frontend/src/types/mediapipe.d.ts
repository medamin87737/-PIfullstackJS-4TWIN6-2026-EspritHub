/**
 * Type declarations for MediaPipe Hands
 * MediaPipe doesn't provide official TypeScript types, so we define them here
 */

declare module '@mediapipe/hands' {
  export interface Landmark {
    x: number;
    y: number;
    z: number;
  }

  export interface NormalizedLandmarkList {
    landmark: Landmark[];
  }

  export interface Results {
    multiHandLandmarks?: NormalizedLandmarkList[];
    multiHandedness?: Array<{
      index: number;
      score: number;
      label: string;
    }>;
    image: HTMLCanvasElement | HTMLImageElement;
  }

  export interface HandsOptions {
    locateFile?: (file: string) => string;
  }

  export interface HandsConfig {
    maxNumHands?: number;
    modelComplexity?: 0 | 1 | 2;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class Hands {
    constructor(options: HandsOptions);
    setOptions(config: HandsConfig): void;
    onResults(callback: (results: Results) => void): void;
    send(inputs: { image: HTMLVideoElement | HTMLImageElement }): Promise<void>;
    close(): void;
  }
}

declare module '@mediapipe/camera_utils' {
  export interface CameraOptions {
    onFrame: () => Promise<void>;
    width?: number;
    height?: number;
  }

  export class Camera {
    constructor(videoElement: HTMLVideoElement, options: CameraOptions);
    start(): Promise<void>;
    stop(): void;
  }
}
