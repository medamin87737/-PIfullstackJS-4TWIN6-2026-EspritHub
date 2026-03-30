/**
 * Tests unitaires pour le module Gesture Detector
 * 
 * Ces tests vérifient le bon fonctionnement des fonctions de calcul de distance
 * et de normalisation pour la détection de gestes.
 */

import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  calculateReferenceDistance,
  normalizedDistance,
} from './gestureDetector';
import { NormalizedLandmark } from '../types/hand-gesture.types';

describe('gestureDetector', () => {
  describe('euclideanDistance', () => {
    it('should calculate distance between two identical points as 0', () => {
      const p1: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0 };
      const p2: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0 };
      
      const distance = euclideanDistance(p1, p2);
      
      expect(distance).toBe(0);
    });

    it('should calculate distance in 2D (z=0)', () => {
      const p1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const p2: NormalizedLandmark = { x: 3, y: 4, z: 0 };
      
      const distance = euclideanDistance(p1, p2);
      
      // Distance should be 5 (3-4-5 triangle)
      expect(distance).toBe(5);
    });

    it('should calculate distance in 3D', () => {
      const p1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const p2: NormalizedLandmark = { x: 1, y: 1, z: 1 };
      
      const distance = euclideanDistance(p1, p2);
      
      // Distance should be √3 ≈ 1.732
      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });

    it('should calculate distance with normalized coordinates (0-1)', () => {
      const p1: NormalizedLandmark = { x: 0.2, y: 0.3, z: 0.1 };
      const p2: NormalizedLandmark = { x: 0.5, y: 0.7, z: 0.2 };
      
      const distance = euclideanDistance(p1, p2);
      
      // dx=0.3, dy=0.4, dz=0.1 → √(0.09 + 0.16 + 0.01) = √0.26
      expect(distance).toBeCloseTo(Math.sqrt(0.26), 5);
    });

    it('should be symmetric (distance(p1,p2) = distance(p2,p1))', () => {
      const p1: NormalizedLandmark = { x: 0.1, y: 0.2, z: 0.3 };
      const p2: NormalizedLandmark = { x: 0.7, y: 0.8, z: 0.9 };
      
      const dist1 = euclideanDistance(p1, p2);
      const dist2 = euclideanDistance(p2, p1);
      
      expect(dist1).toBe(dist2);
    });
  });

  describe('calculateReferenceDistance', () => {
    it('should calculate distance between wrist (0) and middle MCP (9)', () => {
      // Créer un tableau de 21 landmarks
      const landmarks: NormalizedLandmark[] = Array(21).fill(null).map((_, i) => ({
        x: 0,
        y: 0,
        z: 0,
      }));
      
      // Définir le wrist et le middle MCP
      landmarks[0] = { x: 0.5, y: 0.8, z: 0 }; // WRIST
      landmarks[9] = { x: 0.5, y: 0.5, z: 0 }; // MIDDLE_FINGER_MCP
      
      const refDistance = calculateReferenceDistance(landmarks);
      
      // Distance verticale de 0.3
      expect(refDistance).toBeCloseTo(0.3, 5);
    });

    it('should calculate reference distance in 3D', () => {
      const landmarks: NormalizedLandmark[] = Array(21).fill(null).map(() => ({
        x: 0,
        y: 0,
        z: 0,
      }));
      
      landmarks[0] = { x: 0, y: 0, z: 0 }; // WRIST
      landmarks[9] = { x: 0.3, y: 0.4, z: 0.12 }; // MIDDLE_FINGER_MCP
      
      const refDistance = calculateReferenceDistance(landmarks);
      
      // Distance = √(0.09 + 0.16 + 0.0144) = √0.2644 ≈ 0.514
      expect(refDistance).toBeCloseTo(0.514, 2);
    });

    it('should work with realistic hand landmarks', () => {
      const landmarks: NormalizedLandmark[] = Array(21).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0,
      }));
      
      // Simuler une main réaliste
      landmarks[0] = { x: 0.5, y: 0.9, z: 0 }; // WRIST (bas de la main)
      landmarks[9] = { x: 0.5, y: 0.6, z: -0.05 }; // MIDDLE_FINGER_MCP
      
      const refDistance = calculateReferenceDistance(landmarks);
      
      // La distance devrait être positive et raisonnable
      expect(refDistance).toBeGreaterThan(0);
      expect(refDistance).toBeCloseTo(0.304, 2);
    });
  });

  describe('normalizedDistance', () => {
    it('should normalize distance by reference distance', () => {
      const p1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const p2: NormalizedLandmark = { x: 0.3, y: 0.4, z: 0 };
      const referenceDistance = 0.5;
      
      const normalized = normalizedDistance(p1, p2, referenceDistance);
      
      // Distance euclidienne = 0.5, référence = 0.5 → normalized = 1.0
      expect(normalized).toBe(1.0);
    });

    it('should return value > 1 when distance exceeds reference', () => {
      const p1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const p2: NormalizedLandmark = { x: 1, y: 0, z: 0 };
      const referenceDistance = 0.5;
      
      const normalized = normalizedDistance(p1, p2, referenceDistance);
      
      // Distance = 1.0, référence = 0.5 → normalized = 2.0
      expect(normalized).toBe(2.0);
    });

    it('should return value < 1 when distance is less than reference', () => {
      const p1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const p2: NormalizedLandmark = { x: 0.1, y: 0, z: 0 };
      const referenceDistance = 0.5;
      
      const normalized = normalizedDistance(p1, p2, referenceDistance);
      
      // Distance = 0.1, référence = 0.5 → normalized = 0.2
      expect(normalized).toBe(0.2);
    });

    it('should detect extended finger (normalized distance > 0.6)', () => {
      // Simuler un doigt étendu
      const mcp: NormalizedLandmark = { x: 0.5, y: 0.6, z: 0 };
      const tip: NormalizedLandmark = { x: 0.5, y: 0.3, z: 0 };
      const referenceDistance = 0.4; // Distance wrist-middle_mcp
      
      const normalized = normalizedDistance(mcp, tip, referenceDistance);
      
      // Distance = 0.3, référence = 0.4 → normalized = 0.75 > 0.6 (étendu)
      expect(normalized).toBeCloseTo(0.75, 5);
      expect(normalized).toBeGreaterThan(0.6);
    });

    it('should detect closed finger (normalized distance < 0.3)', () => {
      // Simuler un doigt replié
      const mcp: NormalizedLandmark = { x: 0.5, y: 0.6, z: 0 };
      const tip: NormalizedLandmark = { x: 0.52, y: 0.58, z: 0 };
      const referenceDistance = 0.4;
      
      const normalized = normalizedDistance(mcp, tip, referenceDistance);
      
      // Distance très petite → normalized < 0.3 (replié)
      expect(normalized).toBeLessThan(0.3);
    });

    it('should be independent of hand size with proper reference', () => {
      // Petite main
      const smallP1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const smallP2: NormalizedLandmark = { x: 0.1, y: 0, z: 0 };
      const smallRef = 0.2;
      
      // Grande main (proportions identiques)
      const largeP1: NormalizedLandmark = { x: 0, y: 0, z: 0 };
      const largeP2: NormalizedLandmark = { x: 0.2, y: 0, z: 0 };
      const largeRef = 0.4;
      
      const smallNormalized = normalizedDistance(smallP1, smallP2, smallRef);
      const largeNormalized = normalizedDistance(largeP1, largeP2, largeRef);
      
      // Les distances normalisées devraient être identiques
      expect(smallNormalized).toBe(largeNormalized);
      expect(smallNormalized).toBe(0.5);
    });
  });

  describe('Integration - Complete gesture detection flow', () => {
    it('should correctly normalize distances for gesture detection', () => {
      // Créer une main complète avec 21 landmarks
      const landmarks: NormalizedLandmark[] = Array(21).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0,
      }));
      
      // Définir les landmarks clés
      landmarks[0] = { x: 0.5, y: 0.9, z: 0 }; // WRIST
      landmarks[9] = { x: 0.5, y: 0.6, z: 0 }; // MIDDLE_FINGER_MCP
      landmarks[5] = { x: 0.4, y: 0.6, z: 0 }; // INDEX_FINGER_MCP
      landmarks[8] = { x: 0.4, y: 0.3, z: 0 }; // INDEX_FINGER_TIP (étendu)
      
      // Calculer la distance de référence
      const refDistance = calculateReferenceDistance(landmarks);
      expect(refDistance).toBeCloseTo(0.3, 5);
      
      // Vérifier si l'index est étendu
      const indexDistance = normalizedDistance(landmarks[5], landmarks[8], refDistance);
      expect(indexDistance).toBeCloseTo(1.0, 5); // 0.3 / 0.3 = 1.0
      expect(indexDistance).toBeGreaterThan(0.6); // Doigt étendu
    });
  });
});
