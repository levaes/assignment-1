/** Task status enum */
export declare enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in-progress",
    COMPLETED = "completed"
}
/** Task priority enum */
export declare enum TaskPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}
/** Recurring frequency enum */
export declare enum RecurringFrequency {
    DAILY = "daily",
    WEEKLY = "weekly",
    BIWEEKLY = "biweekly",
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
/** Sort field enum */
export declare enum SortField {
    TITLE = "title",
    PRIORITY = "priority",
    STATUS = "status",
    DUE_DATE = "dueDate",
    CREATED_AT = "createdAt",
    UPDATED_AT = "updatedAt"
}
/** Sort direction enum */
export declare enum SortDirection {
    ASC = "asc",
    DESC = "desc"
}
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
/** Result type for operations that can fail */
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
/** Optional type wrapper */
export type Optional<T> = T | null | undefined;
/** Readonly array type */
export type ReadonlyArray<T> = readonly T[];
/** Function type for callbacks */
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
/** Event handler type */
export type EventHandler<T extends Event = Event> = (event: T) => void;
/** Type guard for TaskStatus */
export declare function isTaskStatus(value: unknown): value is TaskStatus;
/** Type guard for TaskPriority */
export declare function isTaskPriority(value: unknown): value is TaskPriority;
/** Type guard for RecurringFrequency */
export declare function isRecurringFrequency(value: unknown): value is RecurringFrequency;
/** Type guard for Task */
export declare function isTask(value: unknown): value is Task;
/** Type guard for Category */
export declare function isCategory(value: unknown): value is Category;
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
//# sourceMappingURL=types.d.ts.map