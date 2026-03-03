/**
 * Task Manager Application
 * Pure JavaScript implementation with localStorage persistence
 */

// Storage key for localStorage
const STORAGE_KEY = 'taskManager_tasks';

// Task status and priority constants
const TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed'
};

const TASK_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

/**
 * Custom error class for task-related errors
 */
class TaskError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'TaskError';
        this.code = code;
    }
}

/**
 * Validation utility functions
 */
const Validator = {
    /**
     * Validate task title
     * @param {string} title - Task title to validate
     * @returns {Object} Validation result
     */
    validateTitle(title) {
        if (!title || typeof title !== 'string') {
            return { valid: false, error: 'Title is required' };
        }
        const trimmed = title.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: 'Title cannot be empty' };
        }
        if (trimmed.length > 100) {
            return { valid: false, error: 'Title must be 100 characters or less' };
        }
        return { valid: true, value: trimmed };
    },

    /**
     * Validate task description
     * @param {string} description - Task description to validate
     * @returns {Object} Validation result
     */
    validateDescription(description) {
        if (description === null || description === undefined) {
            return { valid: true, value: '' };
        }
        if (typeof description !== 'string') {
            return { valid: false, error: 'Description must be a string' };
        }
        if (description.length > 1000) {
            return { valid: false, error: 'Description must be 1000 characters or less' };
        }
        return { valid: true, value: description.trim() };
    },

    /**
     * Validate task status
     * @param {string} status - Task status to validate
     * @returns {Object} Validation result
     */
    validateStatus(status) {
        const validStatuses = Object.values(TASK_STATUS);
        if (!status) {
            return { valid: true, value: TASK_STATUS.PENDING };
        }
        if (!validStatuses.includes(status)) {
            return { valid: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
        }
        return { valid: true, value: status };
    },

    /**
     * Validate task priority
     * @param {string} priority - Task priority to validate
     * @returns {Object} Validation result
     */
    validatePriority(priority) {
        const validPriorities = Object.values(TASK_PRIORITY);
        if (!priority) {
            return { valid: true, value: TASK_PRIORITY.LOW };
        }
        if (!validPriorities.includes(priority)) {
            return { valid: false, error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` };
        }
        return { valid: true, value: priority };
    },

    /**
     * Validate due date
     * @param {string} dueDate - Due date string to validate
     * @returns {Object} Validation result
     */
    validateDueDate(dueDate) {
        if (!dueDate) {
            return { valid: true, value: null };
        }
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) {
            return { valid: false, error: 'Invalid date format' };
        }
        return { valid: true, value: dueDate };
    },

    /**
     * Validate tags array
     * @param {Array} tags - Tags array to validate
     * @returns {Object} Validation result
     */
    validateTags(tags) {
        if (!tags) {
            return { valid: true, value: [] };
        }
        if (!Array.isArray(tags)) {
            return { valid: false, error: 'Tags must be an array' };
        }
        const validTags = tags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0 && tag.length <= 30);
        return { valid: true, value: [...new Set(validTags)] };
    }
};

/**
 * Storage service for managing tasks in localStorage
 */
const StorageService = {
    /**
     * Get all tasks from localStorage
     * @returns {Promise<Array>} Array of tasks
     */
    async getTasks() {
        return new Promise((resolve, reject) => {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                const tasks = data ? JSON.parse(data) : [];
                resolve(tasks);
            } catch (error) {
                reject(new TaskError('Failed to read tasks from storage', 'STORAGE_READ_ERROR'));
            }
        });
    },

    /**
     * Save tasks to localStorage
     * @param {Array} tasks - Array of tasks to save
     * @returns {Promise<void>}
     */
    async saveTasks(tasks) {
        return new Promise((resolve, reject) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
                resolve();
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    reject(new TaskError('Storage quota exceeded', 'STORAGE_QUOTA_ERROR'));
                } else {
                    reject(new TaskError('Failed to save tasks to storage', 'STORAGE_WRITE_ERROR'));
                }
            }
        });
    },

    /**
     * Clear all tasks from localStorage
     * @returns {Promise<void>}
     */
    async clearTasks() {
        return new Promise((resolve, reject) => {
            try {
                localStorage.removeItem(STORAGE_KEY);
                resolve();
            } catch (error) {
                reject(new TaskError('Failed to clear tasks from storage', 'STORAGE_CLEAR_ERROR'));
            }
        });
    }
};

/**
 * Task model factory
 */
const TaskFactory = {
    /**
     * Create a new task object
     * @param {Object} data - Task data
     * @returns {Object} Task object
     */
    create(data) {
        return {
            id: this.generateId(),
            title: data.title,
            description: data.description || '',
            status: data.status || TASK_STATUS.PENDING,
            priority: data.priority || TASK_PRIORITY.LOW,
            dueDate: data.dueDate || null,
            tags: data.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    /**
     * Generate unique ID for task
     * @returns {string} Unique ID
     */
    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

/**
 * Main Task Manager module
 */
const TaskManager = {
    tasks: [],
    currentTags: [],
    editingTaskId: null,

    /**
     * Initialize the task manager
     */
    async init() {
        try {
            this.tasks = await StorageService.getTasks();
            this.renderTasks();
            this.setupEventListeners();
        } catch (error) {
            this.showError('Failed to initialize task manager: ' + error.message);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.debounce(() => this.handleSearch(), 300));

        // Filter inputs
        document.getElementById('filterStatus').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterPriority').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterDueDate').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterTags').addEventListener('input', this.debounce(() => this.renderTasks(), 300));

        // Tag input
        const tagInput = document.getElementById('tagInput');
        tagInput.addEventListener('keydown', (e) => this.handleTagInput(e));

        // Close modal on outside click
        const modal = document.getElementById('taskModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    },

    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Handle search input
     */
    handleSearch() {
        this.renderTasks();
    },

    /**
     * Handle tag input
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const input = e.target;
            const tag = input.value.trim().toLowerCase();
            
            if (tag && !this.currentTags.includes(tag) && tag.length <= 30) {
                this.currentTags.push(tag);
                this.renderTags();
            }
            input.value = '';
        }
    },

    /**
     * Render tags in the input container
     */
    renderTags() {
        const container = document.getElementById('tagsContainer');
        const input = document.getElementById('tagInput');
        
        // Clear existing tags
        container.querySelectorAll('.tag-chip').forEach(chip => chip.remove());
        
        // Add tag chips
        this.currentTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `
                ${this.escapeHtml(tag)}
                <button type="button" onclick="TaskManager.removeTag('${this.escapeHtml(tag)}')">&times;</button>
            `;
            container.insertBefore(chip, input);
        });
    },

    /**
     * Remove a tag
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderTags();
    },

    /**
     * Open add task modal
     */
    openAddModal() {
        this.editingTaskId = null;
        this.currentTags = [];
        document.getElementById('modalTitle').textContent = 'Add New Task';
        document.getElementById('taskForm').reset();
        document.getElementById('submitBtn').textContent = 'Add Task';
        this.renderTags();
        this.showModal();
    },

    /**
     * Open edit task modal
     * @param {string} taskId - ID of task to edit
     */
    openEditModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            this.showError('Task not found');
            return;
        }

        this.editingTaskId = taskId;
        this.currentTags = [...task.tags];
        
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('submitBtn').textContent = 'Update Task';
        
        this.renderTags();
        this.showModal();
    },

    /**
     * Show modal
     */
    showModal() {
        document.getElementById('taskModal').classList.add('active');
        document.getElementById('taskTitle').focus();
    },

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('taskModal').classList.remove('active');
        document.getElementById('modalError').classList.remove('visible');
        this.editingTaskId = null;
        this.currentTags = [];
    },

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     * @returns {boolean} False to prevent form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            tags: this.currentTags
        };

        try {
            if (this.editingTaskId) {
                await this.updateTask(this.editingTaskId, formData);
            } else {
                await this.addTask(formData);
            }
            this.closeModal();
        } catch (error) {
            this.showModalError(error.message);
        }
        
        return false;
    },

    /**
     * Add a new task
     * @param {Object} data - Task data
     * @returns {Promise<Object>} Created task
     */
    async addTask(data) {
        // Validate all fields
        const validatedData = await this.validateTaskData(data);
        
        // Create task
        const task = TaskFactory.create(validatedData);
        
        // Add to tasks array
        this.tasks.push(task);
        
        // Save to storage
        await StorageService.saveTasks(this.tasks);
        
        // Re-render
        this.renderTasks();
        this.showSuccess('Task added successfully');
        
        return task;
    },

    /**
     * Update an existing task
     * @param {string} taskId - ID of task to update
     * @param {Object} data - Updated task data
     * @returns {Promise<Object>} Updated task
     */
    async updateTask(taskId, data) {
        // Find task
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new TaskError('Task not found', 'TASK_NOT_FOUND');
        }

        // Validate all fields
        const validatedData = await this.validateTaskData(data);
        
        // Update task
        this.tasks[taskIndex] = {
            ...this.tasks[taskIndex],
            ...validatedData,
            updatedAt: new Date().toISOString()
        };
        
        // Save to storage
        await StorageService.saveTasks(this.tasks);
        
        // Re-render
        this.renderTasks();
        this.showSuccess('Task updated successfully');
        
        return this.tasks[taskIndex];
    },

    /**
     * Delete a task
     * @param {string} taskId - ID of task to delete
     * @returns {Promise<void>}
     */
    async deleteTask(taskId) {
        // Find task
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new TaskError('Task not found', 'TASK_NOT_FOUND');
        }

        // Remove from array
        this.tasks.splice(taskIndex, 1);
        
        // Save to storage
        await StorageService.saveTasks(this.tasks);
        
        // Re-render
        this.renderTasks();
        this.showSuccess('Task deleted successfully');
    },

    /**
     * Toggle task status
     * @param {string} taskId - ID of task to toggle
     * @returns {Promise<void>}
     */
    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new TaskError('Task not found', 'TASK_NOT_FOUND');
        }

        const statusOrder = [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED];
        const currentIndex = statusOrder.indexOf(task.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        await this.updateTask(taskId, { ...task, status: nextStatus });
    },

    /**
     * Validate task data
     * @param {Object} data - Task data to validate
     * @returns {Promise<Object>} Validated data
     */
    async validateTaskData(data) {
        return new Promise((resolve, reject) => {
            const errors = [];
            const validated = {};

            // Validate title
            const titleResult = Validator.validateTitle(data.title);
            if (!titleResult.valid) {
                errors.push(titleResult.error);
            } else {
                validated.title = titleResult.value;
            }

            // Validate description
            const descResult = Validator.validateDescription(data.description);
            if (!descResult.valid) {
                errors.push(descResult.error);
            } else {
                validated.description = descResult.value;
            }

            // Validate status
            const statusResult = Validator.validateStatus(data.status);
            if (!statusResult.valid) {
                errors.push(statusResult.error);
            } else {
                validated.status = statusResult.value;
            }

            // Validate priority
            const priorityResult = Validator.validatePriority(data.priority);
            if (!priorityResult.valid) {
                errors.push(priorityResult.error);
            } else {
                validated.priority = priorityResult.value;
            }

            // Validate due date
            const dateResult = Validator.validateDueDate(data.dueDate);
            if (!dateResult.valid) {
                errors.push(dateResult.error);
            } else {
                validated.dueDate = dateResult.value;
            }

            // Validate tags
            const tagsResult = Validator.validateTags(data.tags);
            if (!tagsResult.valid) {
                errors.push(tagsResult.error);
            } else {
                validated.tags = tagsResult.value;
            }

            if (errors.length > 0) {
                reject(new TaskError(errors.join('. '), 'VALIDATION_ERROR'));
            } else {
                resolve(validated);
            }
        });
    },

    /**
     * Get filtered and searched tasks
     * @returns {Array} Filtered tasks
     */
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply search
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                task.tags.some(tag => tag.includes(searchTerm))
            );
        }

        // Apply status filter
        const statusFilter = document.getElementById('filterStatus').value;
        if (statusFilter) {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        // Apply priority filter
        const priorityFilter = document.getElementById('filterPriority').value;
        if (priorityFilter) {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }

        // Apply due date filter
        const dueDateFilter = document.getElementById('filterDueDate').value;
        if (dueDateFilter) {
            filtered = filtered.filter(task => task.dueDate === dueDateFilter);
        }

        // Apply tag filter
        const tagFilter = document.getElementById('filterTags').value.toLowerCase().trim();
        if (tagFilter) {
            filtered = filtered.filter(task => 
                task.tags.some(tag => tag.includes(tagFilter))
            );
        }

        // Sort by priority (high first) then by due date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filtered.sort((a, b) => {
            // First sort by status (completed last)
            if (a.status === TASK_STATUS.COMPLETED && b.status !== TASK_STATUS.COMPLETED) return 1;
            if (a.status !== TASK_STATUS.COMPLETED && b.status === TASK_STATUS.COMPLETED) return -1;
            
            // Then by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Then by due date
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            
            return 0;
        });

        return filtered;
    },

    /**
     * Render tasks to the DOM
     */
    renderTasks() {
        const taskList = document.getElementById('taskList');
        const taskCount = document.getElementById('taskCount');
        const filtered = this.getFilteredTasks();

        taskCount.textContent = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;

        if (filtered.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                    <p>No tasks found</p>
                    <p style="font-size: 14px; margin-top: 10px;">Click "Add New Task" to get started</p>
                </div>
            `;
            return;
        }

        taskList.innerHTML = filtered.map(task => this.renderTaskItem(task)).join('');
    },

    /**
     * Render a single task item
     * @param {Object} task - Task to render
     * @returns {string} HTML string
     */
    renderTaskItem(task) {
        const statusClass = `status-${task.status}`;
        const priorityClass = `priority-${task.priority}`;
        const isCompleted = task.status === TASK_STATUS.COMPLETED;

        return `
            <div class="task-item ${statusClass} ${priorityClass}" data-id="${task.id}">
                <div class="task-header">
                    <span class="task-title">${this.escapeHtml(task.title)}</span>
                    <div class="task-actions">
                        <button class="btn-success" onclick="TaskManager.toggleTaskStatus('${task.id}')" title="Toggle status">
                            ${isCompleted ? '↩️' : '✓'}
                        </button>
                        <button class="btn-primary" onclick="TaskManager.openEditModal('${task.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-danger" onclick="TaskManager.confirmDelete('${task.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="status-badge ${statusClass}">${this.formatStatus(task.status)}</span>
                    <span>Priority: ${this.formatPriority(task.priority)}</span>
                    ${task.dueDate ? `<span>📅 ${this.formatDate(task.dueDate)}</span>` : ''}
                    ${task.tags.length > 0 ? `<span>${task.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(' ')}</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Confirm task deletion
     * @param {string} taskId - ID of task to delete
     */
    async confirmDelete(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await this.deleteTask(taskId);
            } catch (error) {
                this.showError(error.message);
            }
        }
    },

    /**
     * Clear all filters
     */
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterPriority').value = '';
        document.getElementById('filterDueDate').value = '';
        document.getElementById('filterTags').value = '';
        this.renderTasks();
    },

    /**
     * Format status for display
     * @param {string} status - Status value
     * @returns {string} Formatted status
     */
    formatStatus(status) {
        const labels = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return labels[status] || status;
    },

    /**
     * Format priority for display
     * @param {string} priority - Priority value
     * @returns {string} Formatted priority
     */
    formatPriority(priority) {
        const labels = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High'
        };
        return labels[priority] || priority;
    },

    /**
     * Format date for display
     * @param {string} dateStr - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        const el = document.getElementById('successMessage');
        el.textContent = message;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 3000);
    },

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const el = document.getElementById('errorMessage');
        el.textContent = message;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 5000);
    },

    /**
     * Show modal error message
     * @param {string} message - Error message
     */
    showModalError(message) {
        const el = document.getElementById('modalError');
        el.textContent = message;
        el.classList.add('visible');
    },

    // Command-line style API for programmatic access
    commands: {
        /**
         * Add a task programmatically
         * @param {Object} data - Task data
         * @returns {Promise<Object>} Created task
         */
        async add(data) {
            return TaskManager.addTask(data);
        },

        /**
         * List all tasks
         * @param {Object} filters - Optional filters
         * @returns {Promise<Array>} Array of tasks
         */
        async list(filters = {}) {
            let tasks = await StorageService.getTasks();
            
            if (filters.status) {
                tasks = tasks.filter(t => t.status === filters.status);
            }
            if (filters.priority) {
                tasks = tasks.filter(t => t.priority === filters.priority);
            }
            if (filters.tag) {
                tasks = tasks.filter(t => t.tags.includes(filters.tag.toLowerCase()));
            }
            
            return tasks;
        },

        /**
         * Update a task
         * @param {string} id - Task ID
         * @param {Object} data - Updated data
         * @returns {Promise<Object>} Updated task
         */
        async update(id, data) {
            return TaskManager.updateTask(id, data);
        },

        /**
         * Delete a task
         * @param {string} id - Task ID
         * @returns {Promise<void>}
         */
        async delete(id) {
            return TaskManager.deleteTask(id);
        },

        /**
         * Search tasks
         * @param {string} query - Search query
         * @returns {Promise<Array>} Matching tasks
         */
        async search(query) {
            const tasks = await StorageService.getTasks();
            const q = query.toLowerCase();
            return tasks.filter(t => 
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.includes(q))
            );
        },

        /**
         * Filter tasks
         * @param {Object} criteria - Filter criteria
         * @returns {Promise<Array>} Filtered tasks
         */
        async filter(criteria) {
            let tasks = await StorageService.getTasks();
            
            if (criteria.status) {
                tasks = tasks.filter(t => t.status === criteria.status);
            }
            if (criteria.priority) {
                tasks = tasks.filter(t => t.priority === criteria.priority);
            }
            if (criteria.dueDate) {
                tasks = tasks.filter(t => t.dueDate === criteria.dueDate);
            }
            if (criteria.tag) {
                tasks = tasks.filter(t => t.tags.includes(criteria.tag.toLowerCase()));
            }
            
            return tasks;
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TaskManager.init();
});

// Expose TaskManager globally for console access
window.TaskManager = TaskManager;
