// ============================================================================
// INDEX - Main Entry Point
// Re-exports all modules for easy importing
// ============================================================================

// Re-export everything from other modules
export * from './types';      // TypeScript type definitions
export * from './utils';       // Utility functions
export * from './storage';     // Storage services
export * from './taskManager'; // Main application

// Import and initialize the application
import { taskManager } from './taskManager';

// App auto-initializes when DOM is ready (see taskManager.ts)
