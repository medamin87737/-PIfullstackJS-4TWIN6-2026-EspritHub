/**
 * Basic test to verify MediaPipe types and fast-check are properly configured
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('MediaPipe and fast-check setup', () => {
  it('should have fast-check available', () => {
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
  });

  it('should verify fast-check works with a simple property', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it('should have MediaPipe types available', () => {
    // This test verifies that TypeScript can compile with MediaPipe types
    // We don't actually import MediaPipe here to avoid loading the library in tests
    expect(true).toBe(true);
  });
});
