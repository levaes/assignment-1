// ============================================================================
// STORAGE SERVICE
// Handles saving and loading from localStorage
// ============================================================================

import { Task, Category, TaskDependency, IStorageService, TaskFilter, TaskSort } from './types';
import { isTask, isCategory } from './types';

/** Storage keys */
export const STORAGE_KEYS = {
    TASKS: 'taskManager_tasks',
    CATEGORIES: 'taskManager_categories',
    DEPENDENCIES: 'taskManager_dependencies',
    SETTINGS: 'taskManager_settings'
} as const;

/** Default storage service implementation */
export class StorageService implements IStorageService {
    private prefix: string;

    constructor(prefix: string = 'taskManager_') {
        this.prefix = prefix;
    }

    /**
     * Load data from localStorage
     */
    async get<T>(key: string): Promise<T[]> {
        try {
            const fullKey = `${this.prefix}${key}`;
            const data = localStorage.getItem(fullKey);
            console.log(`[Storage] get(${key}) - raw data:`, data ? data.substring(0, 100) + '...' : 'null/empty');
            
            if (!data) {
                return [];
            }
            
            const parsed = JSON.parse(data) as T[];
            
            // Validate items if they're tasks or categories
            return parsed.filter(item => {
                if (key === STORAGE_KEYS.TASKS) {
                    return isTask(item);
                }
                if (key === STORAGE_KEYS.CATEGORIES) {
                    return isCategory(item);
                }
                return true;
            });
        } catch (e) {
            console.error(`[Storage] get(${key}) error:`, e);
            return [];
        }
    }

    /**
     * Save data to localStorage
     */
    async set<T>(key: string, data: T[]): Promise<void> {
        const fullKey = `${this.prefix}${key}`;
        console.log(`[Storage] set(${key}) - items count:`, data.length);
        
        try {
            localStorage.setItem(fullKey, JSON.stringify(data));
            console.log(`[Storage] set(${key}) - success`);
        } catch (e) {
            console.error(`[Storage] set(${key}) error:`, e);
            const error = e as Error;
            throw error.name === 'QuotaExceededError' 
                ? Error('Storage full - please delete some tasks')
                : Error('Save failed');
        }
    }

    /**
     * Remove data from localStorage
     */
    async remove(key: string): Promise<void> {
        const fullKey = `${this.prefix}${key}`;
        localStorage.removeItem(fullKey);
    }

    /**
     * Clear all stored data
     */
    async clearAll(): Promise<void> {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(`${this.prefix}${key}`);
        });
    }
}

// ============================================================================
// TASK STORAGE EXTENSIONS
// ============================================================================

export class TaskStorageService extends StorageService {
    /**
     * Get all tasks
     */
    async getTasks(): Promise<Task[]> {
        return this.get<Task>(STORAGE_KEYS.TASKS);
    }

    /**
     * Save all tasks
     */
    async saveTasks(tasks: Task[]): Promise<void> {
        return this.set(STORAGE_KEYS.TASKS, tasks);
    }

    /**
     * Get task by ID
     */
    async getTaskById(id: string): Promise<Task | null> {
        const tasks = await this.getTasks();
        return tasks.find(t => t.id === id) || null;
    }

    /**
     * Add a new task
     */
    async addTask(task: Task): Promise<void> {
        const tasks = await this.getTasks();
        tasks.push(task);
        await this.saveTasks(tasks);
    }

    /**
     * Update a task
     */
    async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
        const tasks = await this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        
        if (index === -1) {
            return null;
        }
        
        tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveTasks(tasks);
        return tasks[index];
    }

    /**
     * Delete a task
     */
    async deleteTask(id: string): Promise<boolean> {
        const tasks = await this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        
        if (filtered.length === tasks.length) {
            return false;
        }
        
        await this.saveTasks(filtered);
        return true;
    }

    /**
     * Filter tasks
     */
    async filterTasks(filter: TaskFilter): Promise<Task[]> {
        let tasks = await this.getTasks();

        if (filter.status) {
            tasks = tasks.filter(t => t.status === filter.status);
        }

        if (filter.priority) {
            tasks = tasks.filter(t => t.priority === filter.priority);
        }

        if (filter.categoryId) {
            tasks = tasks.filter(t => t.categoryId === filter.categoryId);
        }

        if (filter.tag) {
            tasks = tasks.filter(t => t.tags.includes(filter.tag!));
        }

        if (filter.dueDate) {
            tasks = tasks.filter(t => t.dueDate === filter.dueDate);
        }

        if (filter.dateFrom) {
            tasks = tasks.filter(t => t.dueDate && t.dueDate >= filter.dateFrom!);
        }

        if (filter.dateTo) {
            tasks = tasks.filter(t => t.dueDate && t.dueDate <= filter.dateTo!);
        }

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

    /**
     * Sort tasks
     */
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

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }
}

// ============================================================================
// CATEGORY STORAGE EXTENSIONS
// ============================================================================

export class CategoryStorageService extends StorageService {
    /**
     * Get all categories
     */
    async getCategories(): Promise<Category[]> {
        return this.get<Category>(STORAGE_KEYS.CATEGORIES);
    }

    /**
     * Save all categories
     */
    async saveCategories(categories: Category[]): Promise<void> {
        return this.set(STORAGE_KEYS.CATEGORIES, categories);
    }

    /**
     * Add a new category
     */
    async addCategory(category: Category): Promise<void> {
        const categories = await this.getCategories();
        categories.push(category);
        await this.saveCategories(categories);
    }

    /**
     * Update a category
     */
    async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
        const categories = await this.getCategories();
        const index = categories.findIndex(c => c.id === id);
        
        if (index === -1) {
            return null;
        }
        
        categories[index] = { ...categories[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveCategories(categories);
        return categories[index];
    }

    /**
     * Delete a category
     */
    async deleteCategory(id: string): Promise<boolean> {
        const categories = await this.getCategories();
        const filtered = categories.filter(c => c.id !== id);
        
        if (filtered.length === categories.length) {
            return false;
        }
        
        await this.saveCategories(filtered);
        return true;
    }
}

// ============================================================================
// DEPENDENCY STORAGE EXTENSIONS
// ============================================================================

export class DependencyStorageService extends StorageService {
    /**
     * Get all dependencies
     */
    async getDependencies(): Promise<TaskDependency[]> {
        return this.get<TaskDependency>(STORAGE_KEYS.DEPENDENCIES);
    }

    /**
     * Save all dependencies
     */
    async saveDependencies(dependencies: TaskDependency[]): Promise<void> {
        return this.set(STORAGE_KEYS.DEPENDENCIES, dependencies);
    }

    /**
     * Add a dependency
     */
    async addDependency(dependency: TaskDependency): Promise<void> {
        const deps = await this.getDependencies();
        
        // Check for duplicate
        const exists = deps.some(d => 
            d.taskId === dependency.taskId && 
            d.dependsOnTaskId === dependency.dependsOnTaskId
        );
        
        if (!exists) {
            deps.push(dependency);
            await this.saveDependencies(deps);
        }
    }

    /**
     * Remove a dependency
     */
    async removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
        const deps = await this.getDependencies();
        const filtered = deps.filter(d => 
            !(d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId)
        );
        
        if (filtered.length === deps.length) {
            return false;
        }
        
        await this.saveDependencies(filtered);
        return true;
    }

    /**
     * Get dependencies for a task
     */
    async getDependenciesForTask(taskId: string): Promise<TaskDependency[]> {
        const deps = await this.getDependencies();
        return deps.filter(d => d.taskId === taskId);
    }

    /**
     * Get tasks that depend on a task
     */
    async getDependentsForTask(taskId: string): Promise<TaskDependency[]> {
        const deps = await this.getDependencies();
        return deps.filter(d => d.dependsOnTaskId === taskId);
    }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const storage = new TaskStorageService();
export const categoryStorage = new CategoryStorageService();
export const dependencyStorage = new DependencyStorageService();
