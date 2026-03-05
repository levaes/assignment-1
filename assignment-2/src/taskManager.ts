// ============================================================================
// TASK MANAGER - Main application logic
// This is the core of the task management application
// Handles all CRUD operations, UI rendering, and event management
// ============================================================================

import { Task, TaskStatus, TaskPriority, TaskFilter, TaskSort, TaskStatistics, 
    Category, CategoryFactoryData, TaskDependency, RecurringConfig, 
    RecurringFrequency, TaskFactoryData, SortField, SortDirection } from './types';
import { isTaskStatus, isTaskPriority } from './types';
import { debounce, filterBy, searchBy, generateId, formatStatus, formatPriority, 
    formatDate, isOverdue, getDaysUntil } from './utils';
import { TaskStorageService, CategoryStorageService, DependencyStorageService } from './storage';

// ============================================================================
// VALIDATORS - Functions that check if input data is valid
// Used to ensure data meets requirements before saving
// ============================================================================

/** Validators - Collection of validation functions for form fields */
const Validators = {
    title: (v: unknown): string | null => {
        const val = v as string;
        if (!val?.trim()) return 'Title required';
        if (val.trim().length > 100) return 'Title too long (max 100)';
        return null;
    },
    
    description: (v: unknown): string | null => {
        const val = v as string;
        if (val && val.length > 1000) return 'Description too long (max 1000)';
        return null;
    },
    
    status: (v: unknown): string | null => {
        const val = v as string;
        if (val && !isTaskStatus(val)) return 'Invalid status';
        return null;
    },
    
    priority: (v: unknown): string | null => {
        const val = v as string;
        if (val && !isTaskPriority(val)) return 'Invalid priority';
        return null;
    },
    
    date: (v: unknown): string | null => {
        const val = v as string;
        if (val && isNaN(new Date(val).getTime())) return 'Invalid date';
        return null;
    },
    
    tags: (v: unknown): string | null => {
        const val = v as string[];
        if (!Array.isArray(val)) return 'Tags must be an array';
        if (val.some(t => typeof t !== 'string')) return 'All tags must be strings';
        if (val.some(t => t.length > 30)) return 'Tags max 30 characters';
        return null;
    },
    
    categoryId: (v: unknown): string | null => {
        const val = v as string | null | undefined;
        if (val && typeof val !== 'string') return 'Invalid category ID';
        return null;
    }
};

// ============================================================================
// FACTORY FUNCTIONS - Create new objects with default values
// ============================================================================

/**
 * Create a new Task with generated ID and timestamps
 * @param data - Task data from form
 * @returns Complete Task object ready to save
 */
export function createTask(data: TaskFactoryData): Task {
    const now = new Date().toISOString();
    
    return {
        id: generateId('task'),
        title: data.title.trim(),
        description: data.description?.trim() || '',
        status: data.status || TaskStatus.PENDING,
        priority: data.priority || TaskPriority.LOW,
        dueDate: data.dueDate || null,
        tags: processTags(data.tags),
        categoryId: data.categoryId || null,
        recurring: data.recurring || { enabled: false, frequency: RecurringFrequency.WEEKLY, 
            interval: 1, endDate: null, nextOccurrence: null },
        dependsOn: data.dependsOn || [],
        createdAt: now,
        updatedAt: now
    };
}

/** Clean up and deduplicate tags */
function processTags(tags: string[] | undefined): string[] {
    if (!Array.isArray(tags)) return [];
    
    return [...new Set(
        tags.filter((t): t is string => typeof t === 'string')
            .map(t => t.trim().toLowerCase())
            .filter(t => t && t.length <= 30)
    )];
}

/**
 * Create a new Category 
 * @param data - Category data from form
 */
export function createCategory(data: CategoryFactoryData): Category {
    const now = new Date().toISOString();
    
    return {
        id: generateId('category'),
        name: data.name.trim(),
        color: data.color,
        description: data.description?.trim() || '',
        parentId: data.parentId || null,
        priority: data.priority,
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Create a new Dependency (link between tasks)
 * @param taskId - Task that depends on another
 * @param dependsOnTaskId - Task being depended upon
 */
export function createDependency(taskId: string, dependsOnTaskId: string): TaskDependency {
    return {
        id: generateId('dep'),
        taskId,
        dependsOnTaskId,
        createdAt: new Date().toISOString()
    };
}

// ============================================================================
// TASK MANAGER CLASS - Main application controller
// ============================================================================

/**
 * TaskManager - Handles all task management functionality
 * Manages state, storage, UI rendering, and user interactions
 */
export class TaskManager {
    // In-memory storage (loaded from localStorage)
    private tasks: Task[] = [];
    private categories: Category[] = [];
    private dependencies: TaskDependency[] = [];
    
    // Form state
    currentTags: string[] = [];
    editingId: string | null = null;
    private eventsBound: boolean = false;
    
    // Storage services
    private taskStorage: TaskStorageService;
    private categoryStorage: CategoryStorageService;
    private dependencyStorage: DependencyStorageService;
    
    // Current filter and sort settings
    currentFilter: TaskFilter = {};
    currentSort: TaskSort = { field: SortField.STATUS, direction: SortDirection.ASC };

    constructor() {
        // Initialize storage services
        this.taskStorage = new TaskStorageService();
        this.categoryStorage = new CategoryStorageService();
        this.dependencyStorage = new DependencyStorageService();
    }

    // ============================================================================
    // INITIALIZATION - Load data and set up the app
    // ============================================================================

    /** Initialize the app - load data from storage and render UI */
    async init(): Promise<void> {
        try {
            // Load all data from localStorage
            this.tasks = await this.taskStorage.getTasks();
            this.categories = await this.categoryStorage.getCategories();
            this.dependencies = await this.dependencyStorage.getDependencies();
            
            // Check for recurring tasks that need to be created
            await this.processRecurringTasks();
            
            // Render the UI
            this.render();
            
            // Set up event listeners
            this.bindEvents();
        } catch (e) {
            console.error('[TaskManager] Init error:', e);
        }
    }

    // ============================================================================
    // EVENT BINDING - Connect HTML elements to JavaScript functions
    // ============================================================================

    /** Set up event listeners for user interactions */
    bindEvents(): void {
        if (this.eventsBound) return;
        this.eventsBound = true;
        
        // Helper to attach event listener to element
        const on = (id: string, e: string, fn: EventListener): void => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(e, fn);
            else console.warn(`[TaskManager] Element #${id} not found`);
        };
        
        // Search input with debounce (wait for user to stop typing)
        on('searchInput', 'input', debounce(() => this.render(), 300) as EventListener);
        
        // Filter dropdowns
        ['filterStatus', 'filterPriority', 'filterDueDate', 'filterCategory'].forEach(id => {
            on(id, 'change', () => this.render());
        });
        
        // Tag filter with debounce
        on('filterTags', 'input', debounce(() => this.render(), 300) as EventListener);
        
        // Sort dropdowns
        on('sortField', 'change', () => { this.updateSort(); this.render(); });
        on('sortDirection', 'change', () => { this.updateSort(); this.render(); });
        
        // Tag input - add tag on Enter or comma
        on('tagInput', 'keydown', (e) => {
            const event = e as KeyboardEvent;
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                this.addTag(event.target as HTMLInputElement);
            }
        });
        
        // Close modal when clicking outside
        document.getElementById('taskModal')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target?.id === 'taskModal') {
                this.closeModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Escape') this.closeModal();
        });
        
        // Task form submission
        document.getElementById('taskForm')?.addEventListener('submit', (e) => {
            this.handleSubmit(e as unknown as Event);
        });
        
        // Category form submission
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
            this.handleCategorySubmit(e as unknown as Event);
        });
    }

    // ============================================================================
    // TAG MANAGEMENT - Add/remove tags from tasks
    // ============================================================================

    /** Add a tag to currentTags array */
    addTag(input: HTMLInputElement): void {
        const tag = input.value.trim().toLowerCase();
        if (tag && !this.currentTags.includes(tag) && tag.length <= 30) {
            this.currentTags.push(tag);
            this.renderTags();
        }
        input.value = '';
    }

    /** Remove a tag from currentTags array */
    removeTag(tag: string): void {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderTags();
    }

    /** Render tag chips in the form */
    renderTags(): void {
        const container = document.getElementById('tagsContainer');
        const input = document.getElementById('tagInput') as HTMLInputElement | null;
        if (!container) return;
        
        container.querySelectorAll('.tag-chip').forEach(t => t.remove());
        
        this.currentTags.forEach(t => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${this.escapeHtml(t)} <button type="button" onclick="taskManager.removeTag('${this.escapeHtml(t)}')">&times;</button>`;
            container.insertBefore(chip, input);
        });
    }

    // ============================================================================
    // MODAL MANAGEMENT - Open/close dialogs
    // ============================================================================

    /** Open the task form modal */
    openModal(edit: Task | null = null): void {
        this.editingId = edit?.id || null;
        this.currentTags = edit ? [...edit.tags] : [];
        
        // Update modal title and button
        const titleEl = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtn');
        if (titleEl) titleEl.textContent = edit ? 'Edit Task' : 'Add New Task';
        if (submitBtn) submitBtn.textContent = edit ? 'Update Task' : 'Add Task';
        
        // Reset and populate form
        const form = document.getElementById('taskForm') as HTMLFormElement | null;
        if (form) form.reset();
        
        if (edit) {
            this.setFormValue('taskId', edit.id);
            this.setFormValue('taskTitle', edit.title);
            this.setFormValue('taskDescription', edit.description);
            this.setFormValue('taskStatus', edit.status);
            this.setFormValue('taskPriority', edit.priority);
            this.setFormValue('taskDueDate', edit.dueDate || '');
            
            if (edit.recurring?.enabled) {
                this.setFormValue('recurringEnabled', 'true');
                this.setFormValue('recurringFrequency', edit.recurring.frequency);
                this.setFormValue('recurringInterval', String(edit.recurring.interval));
            }
        }
        
        this.renderTags();
        
        // Show modal and focus input
        document.getElementById('taskModal')?.classList.add('active');
        (document.getElementById('taskTitle') as HTMLInputElement)?.focus();
    }

    /** Close the task form modal */
    closeModal(): void {
        document.getElementById('taskModal')?.classList.remove('active');
        document.getElementById('modalError')?.classList.remove('visible');
        this.editingId = null;
        this.currentTags = [];
    }

    /** Open modal for editing by task ID */
    openModalById(taskId: string): void {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) this.openModal(task);
    }

    /** Set form field value */
    private setFormValue(id: string, value: string): void {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
        if (el) el.value = value;
    }

    // ============================================================================
    // FORM SUBMISSION - Handle creating/updating tasks
    // ============================================================================

    /** Handle task form submission */
    async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        
        // Get form values
        const data: TaskFactoryData = {
            title: (document.getElementById('taskTitle') as HTMLInputElement | null)?.value || '',
            description: (document.getElementById('taskDescription') as HTMLTextAreaElement | null)?.value || '',
            status: (document.getElementById('taskStatus') as HTMLSelectElement | null)?.value as TaskStatus || TaskStatus.PENDING,
            priority: (document.getElementById('taskPriority') as HTMLSelectElement | null)?.value as TaskPriority || TaskPriority.LOW,
            dueDate: (document.getElementById('taskDueDate') as HTMLInputElement | null)?.value || null,
            tags: this.currentTags,
            categoryId: (document.getElementById('taskCategory') as HTMLSelectElement | null)?.value || null,
            dependsOn: this.getSelectedDependencies()
        };
        
        // Handle recurring tasks
        const recurringEnabled = (document.getElementById('recurringEnabled') as HTMLInputElement | null)?.checked;
        if (recurringEnabled) {
            const frequency = (document.getElementById('recurringFrequency') as HTMLSelectElement | null)?.value as RecurringFrequency || RecurringFrequency.WEEKLY;
            const interval = parseInt((document.getElementById('recurringInterval') as HTMLInputElement | null)?.value || '1', 10);
            
            data.recurring = {
                enabled: true,
                frequency,
                interval,
                endDate: null,
                nextOccurrence: this.calculateNextOccurrence(frequency, interval)
            };
        }
        
        // Validate and check for errors
        const errors = this.validateTask(data);
        if (errors.length > 0) {
            this.showModalError(errors[0]);
            return;
        }
        
        try {
            if (this.editingId) {
                // Update existing task
                const index = this.tasks.findIndex(t => t.id === this.editingId);
                if (index !== -1) {
                    this.tasks[index] = { ...this.tasks[index], ...data, updatedAt: new Date().toISOString() };
                    this.msg('Task updated');
                    await this.taskStorage.saveTasks(this.tasks);
                    this.closeModal();
                    this.render();
                }
            } else {
                // Create new task
                this.tasks.push(createTask(data));
                this.msg('Task added');
                await this.taskStorage.saveTasks(this.tasks);
                this.closeModal();
                this.render();
            }
        } catch (err) {
            this.showModalError(err instanceof Error ? err.message : 'An error occurred');
        }
    }

    /** Get selected dependencies from checkboxes */
    private getSelectedDependencies(): string[] {
        const checkboxes = document.querySelectorAll('.dependency-checkbox:checked') as NodeListOf<HTMLInputElement>;
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /** Validate task data and return list of errors */
    private validateTask(data: TaskFactoryData): string[] {
        const errors: string[] = [];
        
        const validators = [
            Validators.title(data.title),
            Validators.description(data.description),
            Validators.status(data.status),
            Validators.priority(data.priority),
            Validators.date(data.dueDate),
            Validators.tags(data.tags),
            Validators.categoryId(data.categoryId)
        ];
        
        validators.forEach(e => { if (e) errors.push(e); });
        
        return errors;
    }

    // ============================================================================
    // TASK OPERATIONS - Toggle status, delete
    // ============================================================================

    /** Cycle through task statuses (pending -> in progress -> completed) */
    async toggleStatus(id: string): Promise<void> {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        const statusOrder = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];
        const currentIndex = statusOrder.indexOf(task.status);
        task.status = statusOrder[(currentIndex + 1) % 3];
        task.updatedAt = new Date().toISOString();
        
        // If completing a recurring task, create the next occurrence
        if (task.status === TaskStatus.COMPLETED && task.recurring?.enabled) {
            await this.createRecurringTask(task);
        }
        
        await this.taskStorage.saveTasks(this.tasks);
        this.render();
    }

    /** Delete a task */
    async deleteTask(id: string): Promise<void> {
        if (!confirm('Delete this task?')) return;
        
        this.tasks = this.tasks.filter(t => t.id !== id);
        
        // Remove related dependencies
        this.dependencies = this.dependencies.filter(d => d.taskId !== id && d.dependsOnTaskId !== id);
        
        await this.taskStorage.saveTasks(this.tasks);
        await this.dependencyStorage.saveDependencies(this.dependencies);
        
        this.msg('Task deleted');
        this.render();
    }

    // ============================================================================
    // RECURRING TASKS - Handle repeating tasks
    // ============================================================================

    /** Calculate the next occurrence date based on frequency */
    private calculateNextOccurrence(frequency: RecurringFrequency, interval: number): string {
        const now = new Date();
        let next: Date;
        
        switch (frequency) {
            case RecurringFrequency.DAILY: next = new Date(now.setDate(now.getDate() + interval)); break;
            case RecurringFrequency.WEEKLY: next = new Date(now.setDate(now.getDate() + 7 * interval)); break;
            case RecurringFrequency.BIWEEKLY: next = new Date(now.setDate(now.getDate() + 14 * interval)); break;
            case RecurringFrequency.MONTHLY: next = new Date(now.setMonth(now.getMonth() + interval)); break;
            case RecurringFrequency.YEARLY: next = new Date(now.setFullYear(now.getFullYear() + interval)); break;
            default: next = new Date(now.setDate(now.getDate() + 7 * interval));
        }
        
        return next.toISOString();
    }

    /** Create a new task when a recurring task is completed */
    private async createRecurringTask(completedTask: Task): Promise<void> {
        if (!completedTask.recurring?.enabled) return;
        
        const { frequency, interval, endDate } = completedTask.recurring;
        
        // Check if we've reached the end date
        if (endDate) {
            const nextOccurrence = this.calculateNextOccurrence(frequency, interval);
            if (new Date(nextOccurrence) > new Date(endDate)) return;
        }
        
        // Create new task based on the completed one
        const newTask = createTask({
            title: completedTask.title,
            description: completedTask.description,
            status: TaskStatus.PENDING,
            priority: completedTask.priority,
            dueDate: this.calculateNextOccurrence(frequency, interval),
            tags: completedTask.tags,
            categoryId: completedTask.categoryId,
            dependsOn: []
        });
        
        newTask.recurring = { enabled: true, frequency, interval, endDate, 
            nextOccurrence: this.calculateNextOccurrence(frequency, interval) };
        
        this.tasks.push(newTask);
        await this.taskStorage.saveTasks(this.tasks);
    }

    /** Check and process recurring tasks that are due */
    private async processRecurringTasks(): Promise<void> {
        const now = new Date();
        
        for (const task of this.tasks) {
            if (task.recurring?.enabled && task.recurring.nextOccurrence) {
                const nextDate = new Date(task.recurring.nextOccurrence);
                if (nextDate <= now && task.status !== TaskStatus.PENDING) {
                    await this.createRecurringTask(task);
                }
            }
        }
    }

    // ============================================================================
    // TASK DEPENDENCIES - Handle task relationships
    // ============================================================================

    /** Add a dependency between tasks */
    async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
        if (await this.wouldCreateCircularDependency(taskId, dependsOnTaskId)) {
            throw new Error('Cannot add dependency: would create circular reference');
        }
        
        const dependency = createDependency(taskId, dependsOnTaskId);
        await this.dependencyStorage.addDependency(dependency);
        this.dependencies = await this.dependencyStorage.getDependencies();
    }

    /** Check if adding a dependency would create a cycle (A depends on B depends on A) */
    private async wouldCreateCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
        const visited = new Set<string>();
        const stack = [taskId];
        
        while (stack.length > 0) {
            const current = stack.pop()!;
            if (current === dependsOnTaskId) return true;
            
            if (visited.has(current)) continue;
            visited.add(current);
            
            const deps = this.dependencies.filter(d => d.dependsOnTaskId === current);
            deps.forEach(d => stack.push(d.taskId));
        }
        
        return false;
    }

    /** Get tasks blocking a specific task (incomplete dependencies) */
    getBlockingTasks(taskId: string): Task[] {
        const depIds = this.dependencies
            .filter(d => d.taskId === taskId)
            .map(d => d.dependsOnTaskId);
        
        return this.tasks.filter(t => depIds.includes(t.id) && t.status !== TaskStatus.COMPLETED);
    }

    // ============================================================================
    // FILTER AND SORT - Customize task view
    // ============================================================================

    /** Update current filter from form inputs */
    updateFilter(): void {
        this.currentFilter = {
            status: (this.getFilterValue('filterStatus') as TaskStatus) || null,
            priority: (this.getFilterValue('filterPriority') as TaskPriority) || null,
            dueDate: this.getFilterValue('filterDueDate') || null,
            tag: this.getFilterValue('filterTags') || null,
            categoryId: this.getFilterValue('filterCategory') || null,
            searchQuery: this.getFilterValue('searchInput') || null
        };
    }

    /** Update current sort from form inputs */
    updateSort(): void {
        this.currentSort = {
            field: (this.getFilterValue('sortField') as SortField) || SortField.STATUS,
            direction: (this.getFilterValue('sortDirection') as SortDirection) || SortDirection.ASC
        };
    }

    private getFilterValue(id: string): string {
        return (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || '';
    }

    /** Get filtered and sorted tasks */
    getFiltered(): Task[] {
        this.updateFilter();
        this.updateSort();
        
        let result = [...this.tasks];
        
        // Apply search
        if (this.currentFilter.searchQuery) 
            result = searchBy(result, this.currentFilter.searchQuery, ['title', 'description', 'tags']);
        
        // Apply filters
        if (this.currentFilter.status) 
            result = filterBy(result, t => t.status === this.currentFilter.status);
        if (this.currentFilter.priority) 
            result = filterBy(result, t => t.priority === this.currentFilter.priority);
        if (this.currentFilter.categoryId) 
            result = filterBy(result, t => t.categoryId === this.currentFilter.categoryId);
        if (this.currentFilter.tag) 
            result = filterBy(result, t => t.tags.includes(this.currentFilter.tag!));
        
        // Sort and move completed to bottom
        result = this.taskStorage.sortTasks(result, this.currentSort);
        
        const completed = result.filter(t => t.status === TaskStatus.COMPLETED);
        const notCompleted = result.filter(t => t.status !== TaskStatus.COMPLETED);
        
        return [...notCompleted, ...completed];
    }

    /** Clear all filters */
    clearFilters(): void {
        ['searchInput', 'filterStatus', 'filterPriority', 'filterDueDate', 'filterTags', 'filterCategory'].forEach(id => {
            const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
            if (el) el.value = '';
        });
        
        this.currentFilter = {};
        this.render();
    }

    // ============================================================================
    // STATISTICS - Calculate task metrics
    // ============================================================================

    /** Calculate task statistics for dashboard */
    getStatistics(): TaskStatistics {
        const stats: TaskStatistics = {
            total: this.tasks.length, pending: 0, inProgress: 0, completed: 0, overdue: 0,
            byPriority: { [TaskPriority.LOW]: 0, [TaskPriority.MEDIUM]: 0, [TaskPriority.HIGH]: 0 },
            byCategory: {}, byTag: {}, completionRate: 0, upcomingDue: 0
        };
        
        this.tasks.forEach(task => {
            // Status counts
            if (task.status === TaskStatus.PENDING) stats.pending++;
            else if (task.status === TaskStatus.IN_PROGRESS) stats.inProgress++;
            else if (task.status === TaskStatus.COMPLETED) stats.completed++;
            
            // Priority counts
            stats.byPriority[task.priority]++;
            
            // Category counts
            if (task.categoryId) stats.byCategory[task.categoryId] = (stats.byCategory[task.categoryId] || 0) + 1;
            
            // Tag counts
            task.tags.forEach(tag => stats.byTag[tag] = (stats.byTag[tag] || 0) + 1);
            
            // Overdue check
            if (task.dueDate && isOverdue(task.dueDate) && task.status !== TaskStatus.COMPLETED) stats.overdue++;
            
            // Upcoming due (within 7 days)
            if (task.dueDate && !isOverdue(task.dueDate)) {
                const days = getDaysUntil(task.dueDate);
                if (days !== null && days <= 7 && task.status !== TaskStatus.COMPLETED) stats.upcomingDue++;
            }
        });
        
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        
        return stats;
    }

    // ============================================================================
    // CATEGORY MANAGEMENT
    // ============================================================================

    /** Handle category form submission */
    async handleCategorySubmit(e: Event): Promise<void> {
        e.preventDefault();
        
        const data: CategoryFactoryData = {
            name: (document.getElementById('categoryName') as HTMLInputElement | null)?.value || '',
            color: (document.getElementById('categoryColor') as HTMLInputElement | null)?.value || '#667eea',
            description: (document.getElementById('categoryDescription') as HTMLTextAreaElement | null)?.value || '',
            priority: (document.getElementById('categoryPriority') as HTMLSelectElement | null)?.value as TaskPriority || undefined
        };
        
        if (!data.name.trim()) { this.showError('Category name is required'); return; }
        
        this.categories.push(createCategory(data));
        await this.categoryStorage.saveCategories(this.categories);
        
        this.msg('Category created');
        this.renderCategories();
        this.closeCategoryModal();
    }

    /** Open category modal */
    openCategoryModal(edit: Category | null = null): void {
        const titleEl = document.getElementById('categoryModalTitle');
        if (titleEl) titleEl.textContent = edit ? 'Edit Category' : 'Add Category';
        
        const form = document.getElementById('categoryForm') as HTMLFormElement | null;
        if (form) form.reset();
        
        if (edit) {
            this.setFormValue('categoryId', edit.id);
            this.setFormValue('categoryName', edit.name);
            this.setFormValue('categoryColor', edit.color);
            this.setFormValue('categoryDescription', edit.description || '');
            if (edit.priority) this.setFormValue('categoryPriority', edit.priority);
        }
        
        document.getElementById('categoryModal')?.classList.add('active');
    }

    /** Close category modal */
    closeCategoryModal(): void {
        document.getElementById('categoryModal')?.classList.remove('active');
    }

    /** Delete a category */
    async deleteCategory(id: string): Promise<void> {
        if (!confirm('Delete this category?')) return;
        
        this.categories = this.categories.filter(c => c.id !== id);
        
        // Remove category from tasks
        this.tasks.forEach(task => { if (task.categoryId === id) task.categoryId = null; });
        
        await this.categoryStorage.saveCategories(this.categories);
        await this.taskStorage.saveTasks(this.tasks);
        
        this.msg('Category deleted');
        this.renderCategories();
    }

    /** Get category by ID */
    getCategoryById(id: string): Category | undefined {
        return this.categories.find(c => c.id === id);
    }

    // ============================================================================
    // RENDERING - Update the DOM with current state
    // ============================================================================

    /** Render the task list */
    render(): void {
        const list = document.getElementById('taskList');
        const count = document.getElementById('taskCount');
        
        if (!list || !count) { console.error('[TaskManager] taskList or taskCount not found!'); return; }
        
        const filtered = this.getFiltered();
        count.textContent = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;
        
        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><p>No tasks found</p></div>`;
            return;
        }
        
        list.innerHTML = filtered.map(t => {
            const category = t.categoryId ? this.getCategoryById(t.categoryId) : null;
            const blockingTasks = this.getBlockingTasks(t.id);
            const isBlocked = blockingTasks.length > 0;
            
            return `
                <div class="task-item status-${t.status} priority-${t.priority}" data-id="${this.escapeHtml(t.id)}">
                    <div class="task-header">
                        <span class="task-title ${isBlocked ? 'blocked' : ''}">${this.escapeHtml(t.title)}</span>
                        <div class="task-actions">
                            ${isBlocked ? `<span class="block-badge" title="Waiting on: ${blockingTasks.map(b => b.title).join(', ')}">⏳</span>` : ''}
                            <button class="btn-success" onclick="taskManager.toggleStatus('${this.escapeHtml(t.id)}')">${t.status === TaskStatus.COMPLETED ? '↩️' : '✓'}</button>
                            <button class="btn-primary" onclick="taskManager.openModalById('${this.escapeHtml(t.id)}')">✏️</button>
                            <button class="btn-danger" onclick="taskManager.deleteTask('${this.escapeHtml(t.id)}')">🗑️</button>
                        </div>
                    </div>
                    ${t.description ? `<p class="task-description">${this.escapeHtml(t.description)}</p>` : ''}
                    <div class="task-meta">
                        <span class="status-badge status-${t.status}">${formatStatus(t.status)}</span>
                        <span>Priority: ${formatPriority(t.priority)}</span>
                        ${category ? `<span class="category-badge" style="background-color: ${category.color}">${this.escapeHtml(category.name)}</span>` : ''}
                        ${t.dueDate ? `<span>📅 ${formatDate(t.dueDate)}${isOverdue(t.dueDate) && t.status !== TaskStatus.COMPLETED ? ' (Overdue)' : ''}</span>` : ''}
                        ${t.recurring?.enabled ? '<span>🔄 Recurring</span>' : ''}
                        ${t.tags.length ? `<span>${t.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(' ')}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.renderStatistics();
    }

    /** Render statistics panel */
    renderStatistics(): void {
        const statsPanel = document.getElementById('statsPanel');
        if (!statsPanel) return;
        
        const stats = this.getStatistics();
        
        statsPanel.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div>
                <div class="stat-card pending"><div class="stat-value">${stats.pending}</div><div class="stat-label">Pending</div></div>
                <div class="stat-card in-progress"><div class="stat-value">${stats.inProgress}</div><div class="stat-label">In Progress</div></div>
                <div class="stat-card completed"><div class="stat-value">${stats.completed}</div><div class="stat-label">Completed</div></div>
                <div class="stat-card overdue"><div class="stat-value">${stats.overdue}</div><div class="stat-label">Overdue</div></div>
                <div class="stat-card upcoming"><div class="stat-value">${stats.upcomingDue}</div><div class="stat-label">Due Soon</div></div>
                <div class="stat-card rate"><div class="stat-value">${stats.completionRate.toFixed(1)}%</div><div class="stat-label">Completion Rate</div></div>
            </div>
        `;
    }

    /** Render category list */
    renderCategories(): void {
        const container = document.getElementById('categoryList');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p class="empty-text">No categories yet</p>';
            return;
        }
        
        container.innerHTML = this.categories.map(c => `
            <div class="category-item" style="border-left-color: ${c.color}">
                <span class="category-name">${this.escapeHtml(c.name)}</span>
                <span class="category-priority">${c.priority ? formatPriority(c.priority) : 'Any'}</span>
                <button class="btn-danger btn-sm" onclick="taskManager.deleteCategory('${c.id}')">🗑️</button>
            </div>
        `).join('');
        
        // Update category dropdown
        const select = document.getElementById('taskCategory') as HTMLSelectElement | null;
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">No Category</option>' +
                this.categories.map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`).join('');
            select.value = currentValue;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /** Escape HTML to prevent XSS attacks */
    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Show success message */
    msg(text: string): void {
        const el = document.getElementById('successMessage');
        if (el) { el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 3000); }
    }

    /** Show error message */
    err(text: string): void {
        const el = document.getElementById('errorMessage');
        if (el) { el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 5000); }
    }

    /** Show modal error */
    showModalError(text: string): void {
        const el = document.getElementById('modalError');
        if (el) { el.textContent = text; el.classList.add('visible'); }
    }

    /** Show error */
    showError(text: string): void {
        const el = document.getElementById('errorMessage');
        if (el) { el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 5000); }
    }

    // ============================================================================
    // COMMAND API - Programmatic access
    // ============================================================================

    /** Programmatic API for external code */
    commands = {
        add: (data: TaskFactoryData): void => {
            this.tasks.push(createTask(data));
            this.taskStorage.saveTasks(this.tasks).then(() => this.render());
        },
        
        list: async (filter: TaskFilter = {}): Promise<Task[]> => this.taskStorage.filterTasks(filter),
        
        update: async (id: string, data: Partial<Task>): Promise<Task | null> => {
            const result = await this.taskStorage.updateTask(id, data);
            if (result) {
                const index = this.tasks.findIndex(t => t.id === id);
                if (index !== -1) { this.tasks[index] = result; this.render(); }
            }
            return result;
        },
        
        delete: async (id: string): Promise<void> => {
            await this.taskStorage.deleteTask(id);
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.render();
        },
        
        search: async (query: string): Promise<Task[]> => searchBy(this.tasks, query, ['title', 'description', 'tags']),
        
        stats: (): TaskStatistics => this.getStatistics()
    };
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const taskManager = new TaskManager();

// Make available globally for onclick handlers
(window as unknown as { taskManager: TaskManager }).taskManager = taskManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => taskManager.init());
