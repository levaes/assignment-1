// ============================================================================
// STORAGE - Handles saving/loading data to browser localStorage
// localStorage persists data even after browser is closed
// ============================================================================

import { Task, Category, TaskDependency, IStorageService, TaskFilter, TaskSort } from './types';
import { isTask, isCategory } from './types';

// Keys used to identify data in localStorage
export const STORAGE_KEYS = {
    TASKS: 'taskManager_tasks',
    CATEGORIES: 'taskManager_categories',
    DEPENDENCIES: 'taskManager_dependencies',
    SETTINGS: 'taskManager_settings'
} as const;

// ============================================================================
// STORAGE SERVICE - Base class for all storage operations
// Uses localStorage which stores data as JSON strings
// ============================================================================

/** 
 * StorageService - Handles reading/writing to localStorage
 * Why use localStorage? It's simple, persistent, and requires no backend
 */
export class StorageService implements IStorageService {
    private prefix: string;

    constructor(prefix: string = 'taskManager_') {
        this.prefix = prefix;
    }

    /** Load data from localStorage and parse as JSON */
    async get<T>(key: string): Promise<T[]> {
        try {
            const fullKey = `${this.prefix}${key}`;
            const data = localStorage.getItem(fullKey);
            
            if (!data) return [];  // No data stored yet
            
            const parsed = JSON.parse(data) as T[];
            
            // Validate data when loading tasks or categories
            return parsed.filter(item => {
                if (key === STORAGE_KEYS.TASKS) return isTask(item);
                if (key === STORAGE_KEYS.CATEGORIES) return isCategory(item);
                return true;
            });
        } catch (e) {
            console.error(`[Storage] Error loading ${key}:`, e);
            return [];
        }
    }

    /** Save data to localStorage as JSON string */
    async set<T>(key: string, data: T[]): Promise<void> {
        const fullKey = `${this.prefix}${key}`;
        
        try {
            localStorage.setItem(fullKey, JSON.stringify(data));
        } catch (e) {
            const error = e as Error;
            // Handle quota exceeded (storage full) vs other errors
            throw error.name === 'QuotaExceededError' 
                ? Error('Storage full - please delete some tasks')
                : Error('Save failed');
        }
    }

    /** Remove specific data from localStorage */
    async remove(key: string): Promise<void> {
        localStorage.removeItem(`${this.prefix}${key}`);
    }

    /** Clear all task manager data */
    async clearAll(): Promise<void> {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(`${this.prefix}${key}`);
        });
    }
}

// ============================================================================
// TASK STORAGE - Specialized storage for tasks
// ============================================================================

/** TaskStorageService - CRUD operations for tasks */
export class TaskStorageService extends StorageService {
    /** Get all tasks from storage */
    async getTasks(): Promise<Task[]> {
        return this.get<Task>(STORAGE_KEYS.TASKS);
    }

    /** Save all tasks to storage */
    async saveTasks(tasks: Task[]): Promise<void> {
        return this.set(STORAGE_KEYS.TASKS, tasks);
    }

    /** Find a single task by ID */
    async getTaskById(id: string): Promise<Task | null> {
        const tasks = await this.getTasks();
        return tasks.find(t => t.id === id) || null;
    }

    /** Add a new task */
    async addTask(task: Task): Promise<void> {
        const tasks = await this.getTasks();
        tasks.push(task);
        await this.saveTasks(tasks);
    }

    /** Update an existing task */
    async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
        const tasks = await this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        
        if (index === -1) return null;
        
        // Merge updates with existing task, update timestamp
        tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveTasks(tasks);
        return tasks[index];
    }

    /** Delete a task by ID */
    async deleteTask(id: string): Promise<boolean> {
        const tasks = await this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        
        if (filtered.length === tasks.length) return false;  // Not found
        
        await this.saveTasks(filtered);
        return true;
    }

    /** Filter tasks by various criteria */
    async filterTasks(filter: TaskFilter): Promise<Task[]> {
        let tasks = await this.getTasks();

        // Apply each filter condition if provided
        if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
        if (filter.priority) tasks = tasks.filter(t => t.priority === filter.priority);
        if (filter.categoryId) tasks = tasks.filter(t => t.categoryId === filter.categoryId);
        if (filter.tag) tasks = tasks.filter(t => t.tags.includes(filter.tag!));
        if (filter.dueDate) tasks = tasks.filter(t => t.dueDate === filter.dueDate);
        if (filter.dateFrom) tasks = tasks.filter(t => t.dueDate && t.dueDate >= filter.dateFrom!);
        if (filter.dateTo) tasks = tasks.filter(t => t.dueDate && t.dueDate <= filter.dateTo!);

        // Search in title, description, and tags
        if (filter.searchQuery) {
            const q = filter.searchQuery.toLowerCase();
            tasks = tasks.filter(t => 
                t.title.toLowerCase().includes(q) || 
                t.description.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.toLowerCase().includes(q))
            );
        }

        return tasks;
    }

    /** Sort tasks by field and direction */
    sortTasks(tasks: Task[], sort: TaskSort): Task[] {
        const sorted = [...tasks].sort((a, b) => {
            let aVal: string | number | null | undefined;
            let bVal: string | number | null | undefined;

            switch (sort.field) {
                case 'title':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'priority':
                    aVal = { high: 0, medium: 1, low: 2 }[a.priority];
                    bVal = { high: 0, medium: 1, low: 2 }[b.priority];
                    break;
                case 'status':
                    aVal = { pending: 0, 'in-progress': 1, completed: 2 }[a.status];
                    bVal = { pending: 0, 'in-progress': 1, completed: 2 }[b.status];
                    break;
                case 'dueDate':
                case 'createdAt':
                case 'updatedAt':
                    aVal = a[sort.field] || '';
                    bVal = b[sort.field] || '';
                    break;
            }

            // Handle null/undefined values - put them at the end
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            // Compare values based on sort direction
            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }
}

// ============================================================================
// CATEGORY STORAGE - Specialized storage for categories
// ============================================================================

/** CategoryStorageService - CRUD operations for categories */
export class CategoryStorageService extends StorageService {
    /** Get all categories */
    async getCategories(): Promise<Category[]> {
        return this.get<Category>(STORAGE_KEYS.CATEGORIES);
    }

    /** Save all categories */
    async saveCategories(categories: Category[]): Promise<void> {
        return this.set(STORAGE_KEYS.CATEGORIES, categories);
    }

    /** Add a new category */
    async addCategory(category: Category): Promise<void> {
        const categories = await this.getCategories();
        categories.push(category);
        await this.saveCategories(categories);
    }

    /** Update a category */
    async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
        const categories = await this.getCategories();
        const index = categories.findIndex(c => c.id === id);
        
        if (index === -1) return null;
        
        categories[index] = { ...categories[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveCategories(categories);
        return categories[index];
    }

    /** Delete a category */
    async deleteCategory(id: string): Promise<boolean> {
        const categories = await this.getCategories();
        const filtered = categories.filter(c => c.id !== id);
        
        if (filtered.length === categories.length) return false;
        
        await this.saveCategories(filtered);
        return true;
    }
}

// ============================================================================
// DEPENDENCY STORAGE - Specialized storage for task dependencies
// ============================================================================

/** DependencyStorageService - CRUD operations for task dependencies */
export class DependencyStorageService extends StorageService {
    /** Get all dependencies */
    async getDependencies(): Promise<TaskDependency[]> {
        return this.get<TaskDependency>(STORAGE_KEYS.DEPENDENCIES);
    }

    /** Save all dependencies */
    async saveDependencies(dependencies: TaskDependency[]): Promise<void> {
        return this.set(STORAGE_KEYS.DEPENDENCIES, dependencies);
    }

    /** Add a dependency (if not duplicate) */
    async addDependency(dependency: TaskDependency): Promise<void> {
        const deps = await this.getDependencies();
        
        // Check for duplicate (same task depending on same task)
        const exists = deps.some(d => 
            d.taskId === dependency.taskId && 
            d.dependsOnTaskId === dependency.dependsOnTaskId
        );
        
        if (!exists) {
            deps.push(dependency);
            await this.saveDependencies(deps);
        }
    }

    /** Remove a specific dependency */
    async removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
        const deps = await this.getDependencies();
        const filtered = deps.filter(d => 
            !(d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId)
        );
        
        if (filtered.length === deps.length) return false;
        
        await this.saveDependencies(filtered);
        return true;
    }

    /** Get all tasks that depend on a specific task */
    async getDependenciesForTask(taskId: string): Promise<TaskDependency[]> {
        const deps = await this.getDependencies();
        return deps.filter(d => d.taskId === taskId);
    }

    /** Get all tasks that a specific task depends on */
    async getDependentsForTask(taskId: string): Promise<TaskDependency[]> {
        const deps = await this.getDependencies();
        return deps.filter(d => d.dependsOnTaskId === taskId);
    }
}

// ============================================================================
// EXPORT DEFAULT INSTANCES
// These are ready-to-use instances for the app
// ============================================================================

export const storage = new TaskStorageService();
export const categoryStorage = new CategoryStorageService();
export const dependencyStorage = new DependencyStorageService();
