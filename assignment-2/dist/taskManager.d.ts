import { Task, TaskFilter, TaskSort, TaskStatistics, Category, CategoryFactoryData, TaskDependency, TaskFactoryData } from './types';
/**
 * Creates a new task object with all required properties
 */
export declare function createTask(data: TaskFactoryData): Task;
/**
 * Creates a new category object
 */
export declare function createCategory(data: CategoryFactoryData): Category;
/**
 * Creates a new task dependency
 */
export declare function createDependency(taskId: string, dependsOnTaskId: string): TaskDependency;
export declare class TaskManager {
    private tasks;
    private categories;
    private dependencies;
    currentTags: string[];
    editingId: string | null;
    private taskStorage;
    private categoryStorage;
    private dependencyStorage;
    currentFilter: TaskFilter;
    currentSort: TaskSort;
    constructor();
    init(): Promise<void>;
    bindEvents(): void;
    addTag(input: HTMLInputElement): void;
    removeTag(tag: string): void;
    renderTags(): void;
    openModal(edit?: Task | null): void;
    closeModal(): void;
    private setFormValue;
    handleSubmit(e: Event): Promise<void>;
    private getSelectedDependencies;
    private validateTask;
    toggleStatus(id: string): Promise<void>;
    deleteTask(id: string): Promise<void>;
    private calculateNextOccurrence;
    private createRecurringTask;
    private processRecurringTasks;
    addDependency(taskId: string, dependsOnTaskId: string): Promise<void>;
    private wouldCreateCircularDependency;
    getBlockingTasks(taskId: string): Task[];
    updateFilter(): void;
    updateSort(): void;
    private getFilterValue;
    getFiltered(): Task[];
    clearFilters(): void;
    getStatistics(): TaskStatistics;
    handleCategorySubmit(e: Event): Promise<void>;
    openCategoryModal(edit?: Category | null): void;
    closeCategoryModal(): void;
    deleteCategory(id: string): Promise<void>;
    getCategoryById(id: string): Category | undefined;
    render(): void;
    renderStatistics(): void;
    renderCategories(): void;
    escapeHtml(text: string): string;
    msg(text: string): void;
    err(text: string): void;
    showModalError(text: string): void;
    showError(text: string): void;
    commands: {
        add: (data: TaskFactoryData) => void;
        list: (filter?: TaskFilter) => Promise<Task[]>;
        update: (id: string, data: Partial<Task>) => Promise<Task | null>;
        delete: (id: string) => Promise<void>;
        search: (query: string) => Promise<Task[]>;
        stats: () => TaskStatistics;
    };
}
export declare const taskManager: TaskManager;
//# sourceMappingURL=taskManager.d.ts.map