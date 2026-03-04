import { Task, Category, TaskDependency, IStorageService, TaskFilter, TaskSort } from './types';
/** Storage keys */
export declare const STORAGE_KEYS: {
    readonly TASKS: "taskManager_tasks";
    readonly CATEGORIES: "taskManager_categories";
    readonly DEPENDENCIES: "taskManager_dependencies";
    readonly SETTINGS: "taskManager_settings";
};
/** Default storage service implementation */
export declare class StorageService implements IStorageService {
    private prefix;
    constructor(prefix?: string);
    /**
     * Load data from localStorage
     */
    get<T>(key: string): Promise<T[]>;
    /**
     * Save data to localStorage
     */
    set<T>(key: string, data: T[]): Promise<void>;
    /**
     * Remove data from localStorage
     */
    remove(key: string): Promise<void>;
    /**
     * Clear all stored data
     */
    clearAll(): Promise<void>;
}
export declare class TaskStorageService extends StorageService {
    /**
     * Get all tasks
     */
    getTasks(): Promise<Task[]>;
    /**
     * Save all tasks
     */
    saveTasks(tasks: Task[]): Promise<void>;
    /**
     * Get task by ID
     */
    getTaskById(id: string): Promise<Task | null>;
    /**
     * Add a new task
     */
    addTask(task: Task): Promise<void>;
    /**
     * Update a task
     */
    updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
    /**
     * Delete a task
     */
    deleteTask(id: string): Promise<boolean>;
    /**
     * Filter tasks
     */
    filterTasks(filter: TaskFilter): Promise<Task[]>;
    /**
     * Sort tasks
     */
    sortTasks(tasks: Task[], sort: TaskSort): Task[];
}
export declare class CategoryStorageService extends StorageService {
    /**
     * Get all categories
     */
    getCategories(): Promise<Category[]>;
    /**
     * Save all categories
     */
    saveCategories(categories: Category[]): Promise<void>;
    /**
     * Add a new category
     */
    addCategory(category: Category): Promise<void>;
    /**
     * Update a category
     */
    updateCategory(id: string, updates: Partial<Category>): Promise<Category | null>;
    /**
     * Delete a category
     */
    deleteCategory(id: string): Promise<boolean>;
}
export declare class DependencyStorageService extends StorageService {
    /**
     * Get all dependencies
     */
    getDependencies(): Promise<TaskDependency[]>;
    /**
     * Save all dependencies
     */
    saveDependencies(dependencies: TaskDependency[]): Promise<void>;
    /**
     * Add a dependency
     */
    addDependency(dependency: TaskDependency): Promise<void>;
    /**
     * Remove a dependency
     */
    removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean>;
    /**
     * Get dependencies for a task
     */
    getDependenciesForTask(taskId: string): Promise<TaskDependency[]>;
    /**
     * Get tasks that depend on a task
     */
    getDependentsForTask(taskId: string): Promise<TaskDependency[]>;
}
export declare const storage: TaskStorageService;
export declare const categoryStorage: CategoryStorageService;
export declare const dependencyStorage: DependencyStorageService;
//# sourceMappingURL=storage.d.ts.map