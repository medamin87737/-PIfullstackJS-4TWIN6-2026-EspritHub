/**
 * Test setup file for Vitest
 * This file is executed before running tests
 */

// Add any global test setup here
// For example, you can add custom matchers, mock global objects, etc.

// Mock MediaPipe if needed in tests
(global as any).MediaPipe = {} as any;
