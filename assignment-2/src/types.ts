// ============================================================================
// TYPE DEFINITIONS
// Custom type definitions for all entities
// ============================================================================

// ============================================================================
// ENUM TYPES
// ============================================================================

/** Task status enum */
export enum TaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed'
}

/** Task priority enum */
export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

/** Recurring frequency enum */
export enum RecurringFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    BIWEEKLY = 'biweekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly'
}

/** Sort field enum */
export enum SortField {
    TITLE = 'title',
    PRIORITY = 'priority',
    STATUS = 'status',
    DUE_DATE = 'dueDate',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt'
}

/** Sort direction enum */
export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc'
}

// ============================================================================
// INTERFACE TYPES
// ============================================================================

/** Category entity - groups tasks by category */
export interface Category {
    id: string;
    name: string;
    color: string;
    description?: string;
    parentId?: string | null;
    priority?: TaskPriority;
    createdAt: string;
    updatedAt: string;
}

/** Task dependency - links tasks that depend on each other */
export interface TaskDependency {
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    createdAt: string;
}

/** Recurring task configuration */
export interface RecurringConfig {
    enabled: boolean;
    frequency: RecurringFrequency;
    interval: number;
    endDate?: string | null;
    nextOccurrence?: string | null;
}

/** Task entity - core task object */
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
    dependsOn: string[];
    createdAt: string;
    updatedAt: string;
}

/** Filter options for tasks */
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

/** Sort options for tasks */
export interface TaskSort {
    field: SortField;
    direction: SortDirection;
}

/** Statistics for task overview */
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

/** Validation error */
export interface ValidationError {
    field: string;
    message: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/** Storage service interface */
export interface IStorageService {
    get<T>(key: string): Promise<T[]>;
    set<T>(key: string, data: T[]): Promise<void>;
    remove(key: string): Promise<void>;
}

// ============================================================================
// GENERIC TYPE UTILITIES
// ============================================================================

/** Result type for operations that can fail */
export type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };

/** Optional type wrapper */
export type Optional<T> = T | null | undefined;

/** Readonly array type */
export type ReadonlyArray<T> = readonly T[];

/** Function type for callbacks */
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;

/** Event handler type */
export type EventHandler<T extends Event = Event> = (event: T) => void;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/** Type guard for TaskStatus */
export function isTaskStatus(value: unknown): value is TaskStatus {
    return Object.values(TaskStatus).includes(value as TaskStatus);
}

/** Type guard for TaskPriority */
export function isTaskPriority(value: unknown): value is TaskPriority {
    return Object.values(TaskPriority).includes(value as TaskPriority);
}

/** Type guard for RecurringFrequency */
export function isRecurringFrequency(value: unknown): value is RecurringFrequency {
    return Object.values(RecurringFrequency).includes(value as RecurringFrequency);
}

/** Type guard for Task */
export function isTask(value: unknown): value is Task {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'title' in value &&
        'status' in value
    );
}

/** Type guard for Category */
export function isCategory(value: unknown): value is Category {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'name' in value &&
        'color' in value
    );
}

// ============================================================================
// FACTORY FUNCTION TYPES
// ============================================================================

/** Task factory data */
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

/** Category factory data */
export interface CategoryFactoryData {
    name: string;
    color: string;
    description?: string;
    parentId?: string | null;
    priority?: TaskPriority;
}
