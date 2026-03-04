// ============================================================================
// TASK MANAGER
// Main application logic with TypeScript strict mode
// ============================================================================
import { TaskStatus, TaskPriority, RecurringFrequency, SortField, SortDirection, isTaskStatus, isTaskPriority } from './types';
import { debounce, filterBy, searchBy, generateId, formatStatus, formatPriority, formatDate, isOverdue, getDaysUntil } from './utils';
import { TaskStorageService, CategoryStorageService, DependencyStorageService } from './storage';
// ============================================================================
// VALIDATORS
// ============================================================================
const Validators = {
    title: (v) => {
        const val = v;
        if (!val?.trim())
            return 'Title required';
        if (val.trim().length > 100)
            return 'Title too long (max 100 characters)';
        return null;
    },
    description: (v) => {
        const val = v;
        if (val && val.length > 1000)
            return 'Description too long (max 1000 characters)';
        return null;
    },
    status: (v) => {
        const val = v;
        if (val && !isTaskStatus(val))
            return 'Invalid status';
        return null;
    },
    priority: (v) => {
        const val = v;
        if (val && !isTaskPriority(val))
            return 'Invalid priority';
        return null;
    },
    date: (v) => {
        const val = v;
        if (val && isNaN(new Date(val).getTime()))
            return 'Invalid date';
        return null;
    },
    tags: (v) => {
        const val = v;
        if (!Array.isArray(val))
            return 'Tags must be an array';
        if (val.some(t => typeof t !== 'string'))
            return 'All tags must be strings';
        if (val.some(t => t.length > 30))
            return 'Tags must be under 30 characters';
        return null;
    },
    categoryId: (v) => {
        const val = v;
        if (val && typeof val !== 'string')
            return 'Invalid category ID';
        return null;
    }
};
// ============================================================================
// TASK FACTORY
// ============================================================================
/**
 * Creates a new task object with all required properties
 */
export function createTask(data) {
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
        recurring: data.recurring || {
            enabled: false,
            frequency: RecurringFrequency.WEEKLY,
            interval: 1,
            endDate: null,
            nextOccurrence: null
        },
        dependsOn: data.dependsOn || [],
        createdAt: now,
        updatedAt: now
    };
}
/**
 * Process tags: clean up and remove duplicates
 */
function processTags(tags) {
    if (!Array.isArray(tags))
        return [];
    return [...new Set(tags
            .filter((t) => typeof t === 'string')
            .map(t => t.trim().toLowerCase())
            .filter(t => t && t.length <= 30))];
}
// ============================================================================
// CATEGORY FACTORY
// ============================================================================
/**
 * Creates a new category object
 */
export function createCategory(data) {
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
// ============================================================================
// DEPENDENCY FACTORY
// ============================================================================
/**
 * Creates a new task dependency
 */
export function createDependency(taskId, dependsOnTaskId) {
    return {
        id: generateId('dep'),
        taskId,
        dependsOnTaskId,
        createdAt: new Date().toISOString()
    };
}
// ============================================================================
// TASK MANAGER CLASS
// ============================================================================
export class TaskManager {
    constructor() {
        // In-memory storage
        this.tasks = [];
        this.categories = [];
        this.dependencies = [];
        // Form state
        this.currentTags = [];
        this.editingId = null;
        // Current filter and sort
        this.currentFilter = {};
        this.currentSort = {
            field: SortField.STATUS,
            direction: SortDirection.ASC
        };
        // ============================================================================
        // COMMAND API
        // ============================================================================
        this.commands = {
            add: (data) => {
                const task = createTask(data);
                this.tasks.push(task);
                this.taskStorage.saveTasks(this.tasks).then(() => this.render());
            },
            list: async (filter = {}) => {
                return this.taskStorage.filterTasks(filter);
            },
            update: async (id, data) => {
                const result = await this.taskStorage.updateTask(id, data);
                if (result) {
                    const index = this.tasks.findIndex(t => t.id === id);
                    if (index !== -1) {
                        this.tasks[index] = result;
                    }
                    this.render();
                }
                return result;
            },
            delete: async (id) => {
                await this.taskStorage.deleteTask(id);
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.render();
            },
            search: async (query) => {
                return searchBy(this.tasks, query, ['title', 'description', 'tags']);
            },
            stats: () => {
                return this.getStatistics();
            }
        };
        this.taskStorage = new TaskStorageService();
        this.categoryStorage = new CategoryStorageService();
        this.dependencyStorage = new DependencyStorageService();
    }
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    async init() {
        console.log('[TaskManager] Initializing...');
        try {
            // Load all data from localStorage
            this.tasks = await this.taskStorage.getTasks();
            this.categories = await this.categoryStorage.getCategories();
            this.dependencies = await this.dependencyStorage.getDependencies();
            // Check for recurring tasks that need to be created
            await this.processRecurringTasks();
            console.log(`[TaskManager] Loaded ${this.tasks.length} tasks, ${this.categories.length} categories`);
            // Render the UI
            this.render();
            console.log('[TaskManager] Render complete');
            // Set up event listeners
            this.bindEvents();
            console.log('[TaskManager] Events bound successfully');
        }
        catch (e) {
            console.error('[TaskManager] Init error:', e);
        }
    }
    // ============================================================================
    // EVENT BINDING
    // ============================================================================
    bindEvents() {
        console.log('[TaskManager] Binding events...');
        const on = (id, e, fn) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(e, fn);
            }
            else {
                console.warn(`[TaskManager] WARNING: Element #${id} not found`);
            }
        };
        // Search input with debounce
        on('searchInput', 'input', debounce(() => this.render(), 300));
        // Filter dropdowns
        ['filterStatus', 'filterPriority', 'filterDueDate', 'filterCategory'].forEach(id => {
            on(id, 'change', () => this.render());
        });
        // Tag filter
        on('filterTags', 'input', debounce(() => this.render(), 300));
        // Sort dropdown
        on('sortField', 'change', () => {
            this.updateSort();
            this.render();
        });
        on('sortDirection', 'change', () => {
            this.updateSort();
            this.render();
        });
        // Tag input
        on('tagInput', 'keydown', (e) => {
            const event = e;
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const input = event.target;
                this.addTag(input);
            }
        });
        // Modal click outside
        document.getElementById('taskModal')?.addEventListener('click', (e) => {
            const event = e;
            if (event.target instanceof HTMLElement && event.target.id === 'taskModal') {
                this.closeModal();
            }
        });
        // Escape key
        document.addEventListener('keydown', (e) => {
            const event = e;
            if (event.key === 'Escape') {
                this.closeModal();
            }
        });
        // Task form submission
        const form = document.getElementById('taskForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleSubmit(e);
            });
        }
        // Category form submission
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                this.handleCategorySubmit(e);
            });
        }
    }
    // ============================================================================
    // TAG MANAGEMENT
    // ============================================================================
    addTag(input) {
        const tag = input.value.trim().toLowerCase();
        if (tag && !this.currentTags.includes(tag) && tag.length <= 30) {
            this.currentTags.push(tag);
            this.renderTags();
        }
        input.value = '';
    }
    removeTag(tag) {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderTags();
    }
    renderTags() {
        const container = document.getElementById('tagsContainer');
        const input = document.getElementById('tagInput');
        if (!container)
            return;
        // Remove existing tag chips
        container.querySelectorAll('.tag-chip').forEach(t => t.remove());
        // Create new tag chips
        this.currentTags.forEach(t => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${this.escapeHtml(t)} <button type="button" onclick="taskManager.removeTag('${this.escapeHtml(t)}')">&times;</button>`;
            container.insertBefore(chip, input);
        });
    }
    // ============================================================================
    // MODAL MANAGEMENT
    // ============================================================================
    openModal(edit = null) {
        this.editingId = edit?.id || null;
        this.currentTags = edit ? [...edit.tags] : [];
        const form = document.getElementById('taskForm');
        // Update modal title
        const titleEl = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtn');
        if (titleEl)
            titleEl.textContent = edit ? 'Edit Task' : 'Add New Task';
        if (submitBtn)
            submitBtn.textContent = edit ? 'Update Task' : 'Add Task';
        // Reset form
        if (form)
            form.reset();
        // Populate form if editing
        if (edit) {
            this.setFormValue('taskId', edit.id);
            this.setFormValue('taskTitle', edit.title);
            this.setFormValue('taskDescription', edit.description);
            this.setFormValue('taskStatus', edit.status);
            this.setFormValue('taskPriority', edit.priority);
            this.setFormValue('taskDueDate', edit.dueDate || '');
            // Set recurring fields if enabled
            if (edit.recurring?.enabled) {
                this.setFormValue('recurringEnabled', 'true');
                this.setFormValue('recurringFrequency', edit.recurring.frequency);
                this.setFormValue('recurringInterval', String(edit.recurring.interval));
            }
        }
        // Render tags
        this.renderTags();
        // Show modal
        const modal = document.getElementById('taskModal');
        if (modal)
            modal.classList.add('active');
        // Focus title input
        const titleInput = document.getElementById('taskTitle');
        if (titleInput)
            titleInput.focus();
    }
    closeModal() {
        const modal = document.getElementById('taskModal');
        if (modal)
            modal.classList.remove('active');
        const errorEl = document.getElementById('modalError');
        if (errorEl)
            errorEl.classList.remove('visible');
        this.editingId = null;
        this.currentTags = [];
    }
    setFormValue(id, value) {
        const el = document.getElementById(id);
        if (el)
            el.value = value;
    }
    // ============================================================================
    // FORM SUBMISSION
    // ============================================================================
    async handleSubmit(e) {
        e.preventDefault();
        // Get form values
        const data = {
            title: document.getElementById('taskTitle')?.value || '',
            description: document.getElementById('taskDescription')?.value || '',
            status: document.getElementById('taskStatus')?.value || TaskStatus.PENDING,
            priority: document.getElementById('taskPriority')?.value || TaskPriority.LOW,
            dueDate: document.getElementById('taskDueDate')?.value || null,
            tags: this.currentTags,
            categoryId: document.getElementById('taskCategory')?.value || null,
            dependsOn: this.getSelectedDependencies()
        };
        // Handle recurring
        const recurringEnabled = document.getElementById('recurringEnabled')?.checked;
        if (recurringEnabled) {
            const frequency = document.getElementById('recurringFrequency')?.value || RecurringFrequency.WEEKLY;
            const interval = parseInt(document.getElementById('recurringInterval')?.value || '1', 10);
            data.recurring = {
                enabled: true,
                frequency,
                interval,
                endDate: null,
                nextOccurrence: this.calculateNextOccurrence(frequency, interval)
            };
        }
        // Validate
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
                    const updated = {
                        ...this.tasks[index],
                        ...data,
                        updatedAt: new Date().toISOString()
                    };
                    this.tasks[index] = updated;
                    this.msg('Task updated');
                }
            }
            else {
                // Create new task
                const task = createTask(data);
                this.tasks.push(task);
                this.msg('Task added');
            }
            // Save to localStorage
            await this.taskStorage.saveTasks(this.tasks);
            // Close modal and render
            this.closeModal();
            this.render();
        }
        catch (err) {
            this.showModalError(err instanceof Error ? err.message : 'An error occurred');
        }
    }
    getSelectedDependencies() {
        const checkboxes = document.querySelectorAll('.dependency-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    validateTask(data) {
        const errors = [];
        const titleError = Validators.title(data.title);
        if (titleError)
            errors.push(titleError);
        const descError = Validators.description(data.description);
        if (descError)
            errors.push(descError);
        const statusError = Validators.status(data.status);
        if (statusError)
            errors.push(statusError);
        const priorityError = Validators.priority(data.priority);
        if (priorityError)
            errors.push(priorityError);
        const dateError = Validators.date(data.dueDate);
        if (dateError)
            errors.push(dateError);
        const tagsError = Validators.tags(data.tags);
        if (tagsError)
            errors.push(tagsError);
        return errors;
    }
    // ============================================================================
    // TASK OPERATIONS
    // ============================================================================
    async toggleStatus(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task)
            return;
        const statusOrder = [
            TaskStatus.PENDING,
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED
        ];
        const currentIndex = statusOrder.indexOf(task.status);
        const next = statusOrder[(currentIndex + 1) % 3];
        task.status = next;
        task.updatedAt = new Date().toISOString();
        // Check if task is completed - process recurring
        if (next === TaskStatus.COMPLETED && task.recurring?.enabled) {
            await this.createRecurringTask(task);
        }
        await this.taskStorage.saveTasks(this.tasks);
        this.render();
    }
    async deleteTask(id) {
        if (!confirm('Delete this task?'))
            return;
        this.tasks = this.tasks.filter(t => t.id !== id);
        // Also remove dependencies related to this task
        this.dependencies = this.dependencies.filter(d => d.taskId !== id && d.dependsOnTaskId !== id);
        await this.taskStorage.saveTasks(this.tasks);
        await this.dependencyStorage.saveDependencies(this.dependencies);
        this.msg('Task deleted');
        this.render();
    }
    // ============================================================================
    // RECURRING TASKS
    // ============================================================================
    calculateNextOccurrence(frequency, interval) {
        const now = new Date();
        let next;
        switch (frequency) {
            case RecurringFrequency.DAILY:
                next = new Date(now);
                next.setDate(next.getDate() + interval);
                break;
            case RecurringFrequency.WEEKLY:
                next = new Date(now);
                next.setDate(next.getDate() + (7 * interval));
                break;
            case RecurringFrequency.BIWEEKLY:
                next = new Date(now);
                next.setDate(next.getDate() + (14 * interval));
                break;
            case RecurringFrequency.MONTHLY:
                next = new Date(now);
                next.setMonth(next.getMonth() + interval);
                break;
            case RecurringFrequency.YEARLY:
                next = new Date(now);
                next.setFullYear(next.getFullYear() + interval);
                break;
            default:
                next = new Date(now);
                next.setDate(next.getDate() + (7 * interval));
        }
        return next.toISOString();
    }
    async createRecurringTask(completedTask) {
        if (!completedTask.recurring?.enabled)
            return;
        const { frequency, interval, endDate } = completedTask.recurring;
        // Check if we've reached the end date
        if (endDate) {
            const nextOccurrence = this.calculateNextOccurrence(frequency, interval);
            if (new Date(nextOccurrence) > new Date(endDate)) {
                return; // Don't create more recurring tasks
            }
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
        // Set the recurring config for the new task
        newTask.recurring = {
            enabled: true,
            frequency,
            interval,
            endDate,
            nextOccurrence: this.calculateNextOccurrence(frequency, interval)
        };
        this.tasks.push(newTask);
        await this.taskStorage.saveTasks(this.tasks);
        console.log(`[TaskManager] Created recurring task: ${newTask.id}`);
    }
    async processRecurringTasks() {
        const now = new Date();
        for (const task of this.tasks) {
            if (task.recurring?.enabled && task.recurring.nextOccurrence) {
                const nextDate = new Date(task.recurring.nextOccurrence);
                // If it's time to create the recurring task
                if (nextDate <= now && task.status !== TaskStatus.PENDING) {
                    await this.createRecurringTask(task);
                }
            }
        }
    }
    // ============================================================================
    // TASK DEPENDENCIES
    // ============================================================================
    async addDependency(taskId, dependsOnTaskId) {
        // Check for circular dependency
        if (await this.wouldCreateCircularDependency(taskId, dependsOnTaskId)) {
            throw new Error('Cannot add dependency: would create circular reference');
        }
        const dependency = createDependency(taskId, dependsOnTaskId);
        await this.dependencyStorage.addDependency(dependency);
        this.dependencies = await this.dependencyStorage.getDependencies();
    }
    async wouldCreateCircularDependency(taskId, dependsOnTaskId) {
        // Simple DFS to check for cycles
        const visited = new Set();
        const stack = [taskId];
        while (stack.length > 0) {
            const current = stack.pop();
            if (current === dependsOnTaskId) {
                return true;
            }
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const deps = this.dependencies.filter(d => d.dependsOnTaskId === current);
            for (const dep of deps) {
                stack.push(dep.taskId);
            }
        }
        return false;
    }
    getBlockingTasks(taskId) {
        const depIds = this.dependencies
            .filter(d => d.taskId === taskId)
            .map(d => d.dependsOnTaskId);
        return this.tasks.filter(t => depIds.includes(t.id) && t.status !== TaskStatus.COMPLETED);
    }
    // ============================================================================
    // FILTER AND SORT
    // ============================================================================
    updateFilter() {
        this.currentFilter = {
            status: this.getFilterValue('filterStatus') || null,
            priority: this.getFilterValue('filterPriority') || null,
            dueDate: this.getFilterValue('filterDueDate') || null,
            tag: this.getFilterValue('filterTags') || null,
            categoryId: this.getFilterValue('filterCategory') || null,
            searchQuery: this.getFilterValue('searchInput') || null
        };
    }
    updateSort() {
        const field = this.getFilterValue('sortField') || SortField.STATUS;
        const direction = this.getFilterValue('sortDirection') || SortDirection.ASC;
        this.currentSort = { field, direction };
    }
    getFilterValue(id) {
        const el = document.getElementById(id);
        return el?.value || '';
    }
    getFiltered() {
        this.updateFilter();
        this.updateSort();
        let result = [...this.tasks];
        // Apply search
        if (this.currentFilter.searchQuery) {
            result = searchBy(result, this.currentFilter.searchQuery, ['title', 'description', 'tags']);
        }
        // Apply filters
        if (this.currentFilter.status) {
            result = filterBy(result, t => t.status === this.currentFilter.status);
        }
        if (this.currentFilter.priority) {
            result = filterBy(result, t => t.priority === this.currentFilter.priority);
        }
        if (this.currentFilter.categoryId) {
            result = filterBy(result, t => t.categoryId === this.currentFilter.categoryId);
        }
        if (this.currentFilter.tag) {
            result = filterBy(result, t => t.tags.includes(this.currentFilter.tag));
        }
        if (this.currentFilter.dueDate) {
            result = filterBy(result, t => t.dueDate === this.currentFilter.dueDate);
        }
        // Apply sorting
        result = this.taskStorage.sortTasks(result, this.currentSort);
        // Move completed tasks to bottom
        const completed = [];
        const notCompleted = [];
        result.forEach(t => {
            if (t.status === TaskStatus.COMPLETED) {
                completed.push(t);
            }
            else {
                notCompleted.push(t);
            }
        });
        return [...notCompleted, ...completed];
    }
    clearFilters() {
        ['searchInput', 'filterStatus', 'filterPriority', 'filterDueDate', 'filterTags', 'filterCategory'].forEach(id => {
            const el = document.getElementById(id);
            if (el)
                el.value = '';
        });
        this.currentFilter = {};
        this.render();
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    getStatistics() {
        const stats = {
            total: this.tasks.length,
            pending: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0,
            byPriority: {
                [TaskPriority.LOW]: 0,
                [TaskPriority.MEDIUM]: 0,
                [TaskPriority.HIGH]: 0
            },
            byCategory: {},
            byTag: {},
            completionRate: 0,
            upcomingDue: 0
        };
        const now = new Date();
        this.tasks.forEach(task => {
            // Status counts
            switch (task.status) {
                case TaskStatus.PENDING:
                    stats.pending++;
                    break;
                case TaskStatus.IN_PROGRESS:
                    stats.inProgress++;
                    break;
                case TaskStatus.COMPLETED:
                    stats.completed++;
                    break;
            }
            // Priority counts
            stats.byPriority[task.priority]++;
            // Category counts
            if (task.categoryId) {
                stats.byCategory[task.categoryId] = (stats.byCategory[task.categoryId] || 0) + 1;
            }
            // Tag counts
            task.tags.forEach(tag => {
                stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
            });
            // Overdue check
            if (task.dueDate && isOverdue(task.dueDate) && task.status !== TaskStatus.COMPLETED) {
                stats.overdue++;
            }
            // Upcoming due (within 7 days)
            if (task.dueDate && !isOverdue(task.dueDate)) {
                const days = getDaysUntil(task.dueDate);
                if (days !== null && days <= 7 && task.status !== TaskStatus.COMPLETED) {
                    stats.upcomingDue++;
                }
            }
        });
        // Calculate completion rate
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        return stats;
    }
    // ============================================================================
    // CATEGORY MANAGEMENT
    // ============================================================================
    async handleCategorySubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('categoryName')?.value || '',
            color: document.getElementById('categoryColor')?.value || '#667eea',
            description: document.getElementById('categoryDescription')?.value || '',
            priority: document.getElementById('categoryPriority')?.value || undefined
        };
        if (!data.name.trim()) {
            this.showError('Category name is required');
            return;
        }
        const category = createCategory(data);
        this.categories.push(category);
        await this.categoryStorage.saveCategories(this.categories);
        this.msg('Category created');
        this.renderCategories();
        this.closeCategoryModal();
    }
    openCategoryModal(edit = null) {
        const modal = document.getElementById('categoryModal');
        const titleEl = document.getElementById('categoryModalTitle');
        if (titleEl)
            titleEl.textContent = edit ? 'Edit Category' : 'Add Category';
        const form = document.getElementById('categoryForm');
        if (form)
            form.reset();
        if (edit) {
            this.setFormValue('categoryId', edit.id);
            this.setFormValue('categoryName', edit.name);
            this.setFormValue('categoryColor', edit.color);
            this.setFormValue('categoryDescription', edit.description || '');
            if (edit.priority) {
                this.setFormValue('categoryPriority', edit.priority);
            }
        }
        if (modal)
            modal.classList.add('active');
    }
    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal)
            modal.classList.remove('active');
    }
    async deleteCategory(id) {
        if (!confirm('Delete this category?'))
            return;
        this.categories = this.categories.filter(c => c.id !== id);
        // Remove category from tasks
        this.tasks.forEach(task => {
            if (task.categoryId === id) {
                task.categoryId = null;
            }
        });
        await this.categoryStorage.saveCategories(this.categories);
        await this.taskStorage.saveTasks(this.tasks);
        this.msg('Category deleted');
        this.renderCategories();
    }
    getCategoryById(id) {
        return this.categories.find(c => c.id === id);
    }
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
        console.log('[TaskManager] Rendering tasks...');
        const list = document.getElementById('taskList');
        const count = document.getElementById('taskCount');
        if (!list || !count) {
            console.error('[TaskManager] ERROR: taskList or taskCount element not found!');
            return;
        }
        const filtered = this.getFiltered();
        count.textContent = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p>No tasks found</p>
                </div>
            `;
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
                            <button class="btn-primary" onclick="taskManager.openModal(taskManager.tasks.find(task => task.id === '${this.escapeHtml(t.id)}'))">✏️</button>
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
        // Render statistics if stats panel exists
        this.renderStatistics();
    }
    renderStatistics() {
        const statsPanel = document.getElementById('statsPanel');
        if (!statsPanel)
            return;
        const stats = this.getStatistics();
        statsPanel.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-value">${stats.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card in-progress">
                    <div class="stat-value">${stats.inProgress}</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-card completed">
                    <div class="stat-value">${stats.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card overdue">
                    <div class="stat-value">${stats.overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
                <div class="stat-card upcoming">
                    <div class="stat-value">${stats.upcomingDue}</div>
                    <div class="stat-label">Due Soon</div>
                </div>
                <div class="stat-card rate">
                    <div class="stat-value">${stats.completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
            </div>
        `;
    }
    renderCategories() {
        const container = document.getElementById('categoryList');
        if (!container)
            return;
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
        // Also update category dropdown in task form
        const select = document.getElementById('taskCategory');
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
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    msg(text) {
        const el = document.getElementById('successMessage');
        if (el) {
            el.textContent = text;
            el.classList.add('visible');
            setTimeout(() => el.classList.remove('visible'), 3000);
        }
    }
    err(text) {
        const el = document.getElementById('errorMessage');
        if (el) {
            el.textContent = text;
            el.classList.add('visible');
            setTimeout(() => el.classList.remove('visible'), 5000);
        }
    }
    showModalError(text) {
        const el = document.getElementById('modalError');
        if (el) {
            el.textContent = text;
            el.classList.add('visible');
        }
    }
    showError(text) {
        const el = document.getElementById('errorMessage');
        if (el) {
            el.textContent = text;
            el.classList.add('visible');
            setTimeout(() => el.classList.remove('visible'), 5000);
        }
    }
}
// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================
export const taskManager = new TaskManager();
// Make available globally
window.taskManager = taskManager;
// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => taskManager.init());
//# sourceMappingURL=taskManager.js.map