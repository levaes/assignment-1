// ============================================================================
// INDEX - Main Entry Point
// ============================================================================

// Export all modules
export * from './types';
export * from './utils';
export * from './storage';
export * from './taskManager';

// Import and initialize the application
import { taskManager } from './taskManager';

// The application will auto-initialize when DOM is ready
// This is handled in taskManager.ts
