// ============================================================================
// TYPES - TypeScript type definitions for the Task Manager
// These define the "shape" of our data - what properties each object has
// ============================================================================

// ============================================================================
// ENUM TYPES
// Enums are like "named constants" - they give meaningful names to values
// ============================================================================

/** 
 * TaskStatus - Represents the current state of a task
 * Why use an enum? Makes code readable - "COMPLETED" is clearer than "done"
 */
export enum TaskStatus {
    PENDING = 'pending',        // Task needs to be done
    IN_PROGRESS = 'in-progress', // Task is being worked on
    COMPLETED = 'completed'      // Task is finished
}

/** TaskPriority - How important is this task? */
export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium', 
    HIGH = 'high'
}

/** RecurringFrequency - How often does a task repeat? */
export enum RecurringFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    BIWEEKLY = 'biweekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly'
}

/** SortField - What field to sort tasks by */
export enum SortField {
    TITLE = 'title',
    PRIORITY = 'priority',
    STATUS = 'status',
    DUE_DATE = 'dueDate',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt'
}

/** SortDirection - Ascending or descending order */
export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc'
}

// ============================================================================
// INTERFACE TYPES
// Interfaces define the structure of objects - like a blueprint
// ============================================================================

/** Category - Groups tasks together (e.g., "Work", "Personal") */
export interface Category {
    id: string;              // Unique identifier
    name: string;            // Display name
    color: string;           // Visual color (hex code)
    description?: string;   // Optional description
    parentId?: string | null; // For nested categories
    priority?: TaskPriority; // Default priority for this category
    createdAt: string;       // ISO timestamp
    updatedAt: string;
}

/** TaskDependency - Links tasks together (task B depends on task A) */
export interface TaskDependency {
    id: string;
    taskId: string;          // The dependent task
    dependsOnTaskId: string; // The task it depends on
    createdAt: string;
}

/** RecurringConfig - Configuration for repeating tasks */
export interface RecurringConfig {
    enabled: boolean;           // Is this task recurring?
    frequency: RecurringFrequency; // How often it repeats
    interval: number;           // Every N intervals (e.g., every 2 weeks)
    endDate?: string | null;    // When to stop repeating
    nextOccurrence?: string | null; // Next due date
}

/** Task - The main entity */
export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    tags: string[];
    categoryId?: string | null;
    recurring?: RecurringConfig;
    dependsOn: string[];     // Array of task IDs this depends on
    createdAt: string;
    updatedAt: string;
}

/** TaskFilter - Options for filtering tasks */
export interface TaskFilter {
    status?: TaskStatus | null;
    priority?: TaskPriority | null;
    dueDate?: string | null;
    tag?: string | null;
    categoryId?: string | null;
    searchQuery?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
}

/** TaskSort - Options for sorting tasks */
export interface TaskSort {
    field: SortField;
    direction: SortDirection;
}

/** TaskStatistics - Summary counts for dashboard */
export interface TaskStatistics {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byPriority: Record<TaskPriority, number>;
    byCategory: Record<string, number>;
    byTag: Record<string, number>;
    completionRate: number;
    averageCompletionTime?: number;
    upcomingDue: number;
}

/** ValidationError - Form validation error */
export interface ValidationError {
    field: string;
    message: string;
}

/** ApiResponse - Standard API response wrapper */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/** IStorageService - Interface for storage operations */
export interface IStorageService {
    get<T>(key: string): Promise<T[]>;
    set<T>(key: string, data: T[]): Promise<void>;
    remove(key: string): Promise<void>;
}

// ============================================================================
// GENERIC TYPE UTILITIES
// Generic types that work with any data type
// ============================================================================

/** Result - Represents success or failure of an operation (like a union type) */
export type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };

/** Optional - Can be the value, null, or undefined */
export type Optional<T> = T | null | undefined;

/** Callback - Function that returns nothing (void) */
export type Callback<T = void> = () => T;

/** AsyncCallback - Async function that returns nothing */
export type AsyncCallback<T = void> = () => Promise<T>;

/** EventHandler - Function that handles DOM events */
export type EventHandler<T extends Event = Event> = (event: T) => void;

// ============================================================================
// TYPE GUARDS
// Type guards help TypeScript know the exact type of a value
// They return "true" if the value matches the expected type
// ============================================================================

/** Check if value is a valid TaskStatus */
export function isTaskStatus(value: unknown): value is TaskStatus {
    return Object.values(TaskStatus).includes(value as TaskStatus);
}

/** Check if value is a valid TaskPriority */
export function isTaskPriority(value: unknown): value is TaskPriority {
    return Object.values(TaskPriority).includes(value as TaskPriority);
}

/** Check if value is a valid RecurringFrequency */
export function isRecurringFrequency(value: unknown): value is RecurringFrequency {
    return Object.values(RecurringFrequency).includes(value as RecurringFrequency);
}

/** Check if value is a Task (has required fields) */
export function isTask(value: unknown): value is Task {
    return !!(value && typeof value === 'object' && 'id' in value && 'title' in value && 'status' in value);
}

/** Check if value is a Category */
export function isCategory(value: unknown): value is Category {
    return !!(value && typeof value === 'object' && 'id' in value && 'name' in value && 'color' in value);
}

// ============================================================================
// FACTORY DATA INTERFACES
// These define what data is needed to create new objects
// ============================================================================

/** Data needed to create a Task */
export interface TaskFactoryData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    tags?: string[];
    categoryId?: string | null;
    recurring?: RecurringConfig;
    dependsOn?: string[];
}

/** Data needed to create a Category */
export interface CategoryFactoryData {
    name: string;
    color: string;
    description?: string;
    parentId?: string | null;
    priority?: TaskPriority;
}
