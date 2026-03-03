/**
 * Task Manager Application
 * A simple task management app built with pure JavaScript
 * Uses localStorage to save tasks in the browser so they persist after refresh
 */

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

// The key used to store tasks in the browser's localStorage
// localStorage is a simple way to save data in the browser
const STORAGE_KEY = 'taskManager_tasks';

// Task status options - a task can be in one of these three states
const STATUS = { 
    PENDING: 'pending',        // Task hasn't been started yet
    IN_PROGRESS: 'in-progress', // Task is currently being worked on
    COMPLETED: 'completed'      // Task is finished
};

// Task priority levels - helps organize which tasks are most important
const PRIORITY = { 
    LOW: 'low',      // Not urgent, can be done later
    MEDIUM: 'medium', // Normal priority
    HIGH: 'high'     // Urgent, should be done first
};

// The order in which status cycles when clicking the status toggle button
// This goes: pending -> in-progress -> completed -> pending -> ...
const STATUS_ORDER = [STATUS.PENDING, STATUS.IN_PROGRESS, STATUS.COMPLETED];

// Numerical values for priority - used for sorting (lower number = higher priority)
// High priority = 0 (top), Medium = 1, Low = 2
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// FORMAT: Helper functions to format data for display in the UI
// These make the data look nice when shown to users
const FORMAT = {
    // Convert internal status values to user-friendly display text
    // 'pending' becomes 'Pending', 'in-progress' becomes 'In Progress', etc.
    status: s => ({ pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' }[s] || s),
    
    // Convert internal priority values to user-friendly display text
    priority: p => ({ low: 'Low', medium: 'Medium', high: 'High' }[p] || p),
    
    // Convert ISO date strings to a nice readable format like "Mar 3, 2026"
    // Uses en-US locale for month/day/year format
    date: d => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
};

// ============================================================================
// VALIDATION HELPERS (V)
// ============================================================================
// These functions check if the data entered by the user is valid
// They return an error message if something is wrong, or null if everything is fine

const V = {
    // Validate task title: must exist, not empty, and under 100 characters
    title: v => !v?.trim() ? 'Title required' : v.trim().length > 100 ? 'Title too long' : null,
    
    // Validate description: must be under 1000 characters
    desc: v => v?.length > 1000 ? 'Description too long' : null,
    
    // Validate status: must be one of the allowed status values
    status: v => v && !Object.values(STATUS).includes(v) ? 'Invalid status' : null,
    
    // Validate priority: must be one of the allowed priority values
    priority: v => v && !Object.values(PRIORITY).includes(v) ? 'Invalid priority' : null,
    
    // Validate date: must be a valid date string (not invalid like "abc")
    date: v => v && isNaN(new Date(v).getTime()) ? 'Invalid date' : null,
    
    // Process tags: clean up and remove duplicates
    // - Converts to lowercase
    // - Removes whitespace
    // - Removes duplicates
    // - Keeps only valid tags under 30 characters
    tags: v => Array.isArray(v) ? [...new Set(v.filter(t => typeof t === 'string').map(t => t.trim().toLowerCase()).filter(t => t && t.length <= 30))] : []
};

// ============================================================================
// STORAGE SERVICE
// ============================================================================
// Handles saving and loading tasks from the browser's localStorage
// localStorage is a simple key-value storage that persists between page visits

const Storage = {
    // Load all tasks from localStorage
    // Returns an empty array if no tasks exist yet
    // JSON.parse converts the stored string back into a JavaScript array
    get: async () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
    
    // Save all tasks to localStorage
    // JSON.stringify converts the JavaScript array into a string for storage
    // Throws errors if storage is full or save fails
    save: async (tasks) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
        catch (e) { throw e.name === 'QuotaExceededError' ? Error('Storage full') : Error('Save failed'); }
    }
};

// ============================================================================
// TASK FACTORY FUNCTION
// ============================================================================
// Creates a new task object with all the required properties
// This ensures every task has the same structure with default values

const Task = (data) => ({
    // Generate a unique ID using timestamp + random string
    // This ensures no two tasks have the same ID
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    
    // Required: task title
    title: data.title, 
    
    // Optional: task description (defaults to empty string if not provided)
    description: data.description || '',
    
    // Optional: task status (defaults to 'pending' if not provided)
    status: data.status || STATUS.PENDING, 
    
    // Optional: task priority (defaults to 'low' if not provided)
    priority: data.priority || PRIORITY.LOW,
    
    // Optional: due date (defaults to null if not provided)
    dueDate: data.dueDate || null, 
    
    // Optional: tags array (defaults to empty array if not provided)
    tags: data.tags || [],
    
    // Automatically set creation timestamp when task is created
    createdAt: new Date().toISOString(), 
    
    // Automatically set update timestamp when task is created
    updatedAt: new Date().toISOString()
});

// ============================================================================
// MAIN TASK MANAGER OBJECT
// ============================================================================
// This is the core of the application - contains all the functionality

const TaskManager = {
    // Array to store all tasks in memory
    tasks: [], 
    
    // Array to hold tags currently being added/edited in the form
    currentTags: [], 
    
    // ID of the task currently being edited (null when adding new task)
    editingId: null,

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    // Called when the page loads - sets up the app
    
    async init() {
        // Load tasks from localStorage into memory
        this.tasks = await Storage.get();
        
        // Display the tasks on the page
        this.render();
        
        // Set up event listeners for user interactions
        this.bindEvents();
    },

    // ============================================================================
    // EVENT BINDING
    // ============================================================================
    // Sets up all the event listeners for buttons, inputs, etc.
    // This makes the app interactive
    
    bindEvents() {
        // Helper function to add event listener if element exists
        const on = (id, e, fn) => document.getElementById(id)?.addEventListener(e, fn);
        
        // Search input - filters tasks as user types (with 300ms delay/debounce)
        on('searchInput', 'input', this.debounce(() => this.render(), 300));
        
        // Filter dropdowns - re-render when any filter changes
        ['filterStatus', 'filterPriority', 'filterDueDate'].forEach(id => on(id, 'change', () => this.render()));
        
        // Tag filter input - filters by tags as user types (with 300ms delay)
        on('filterTags', 'input', this.debounce(() => this.render(), 300));
        
        // Tag input - add tag when user presses Enter or comma
        on('tagInput', 'keydown', e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), this.addTag(e.target)));
        
        // Click outside modal to close it
        document.getElementById('taskModal')?.addEventListener('click', e => e.target.id === 'taskModal' && this.closeModal());
        
        // Press Escape key to close modal
        document.addEventListener('keydown', e => e.key === 'Escape' && this.closeModal());
    },

    // ============================================================================
    // DEBOUNCE HELPER
    // ============================================================================
    // Delays function execution until user stops calling it
    // Useful for search inputs - prevents filtering on every keystroke
    // Instead, waits until user stops typing for 'ms' milliseconds
    
    debounce(fn, ms = 300) { 
        let t; // Timer variable
        return (...a) => { 
            // Clear any existing timer
            clearTimeout(t); 
            // Set new timer - function runs only after user stops typing
            t = setTimeout(() => fn(...a), ms); 
        }; 
    },

    // ============================================================================
    // TAG MANAGEMENT
    // ============================================================================
    // Add a new tag from the input field
    
    addTag(input) {
        // Get tag value, trim whitespace, convert to lowercase
        const tag = input.value.trim().toLowerCase();
        
        // Only add if: tag is not empty, not already added, and under 30 chars
        if (tag && !this.currentTags.includes(tag) && tag.length <= 30) {
            this.currentTags.push(tag);
            this.renderTags(); // Update the visual tag chips
        }
        input.value = ''; // Clear the input field
    },

    // ============================================================================
    // REMOVE TAG
    // ============================================================================
    // Remove a tag from the current tags array when user clicks ×
    
    removeTag(tag) { 
        this.currentTags = this.currentTags.filter(t => t !== tag); 
        this.renderTags(); 
    },

    // ============================================================================
    // RENDER TAGS
    // ============================================================================
    // Updates the visual display of tags in the add/edit form
    
    renderTags() {
        // Get the tags container and input element
        const c = document.getElementById('tagsContainer'), i = document.getElementById('tagInput');
        
        // Remove all existing tag chips
        c?.querySelectorAll('.tag-chip').forEach(t => t.remove());
        
        // Create and insert new tag chips for each tag
        this.currentTags.forEach(t => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            // Display tag with remove button (×)
            chip.innerHTML = `${this.esc(t)} <button onclick="TaskManager.removeTag('${this.esc(t)}')">&times;</button>`;
            c?.insertBefore(chip, i); // Insert before the input field
        });
    },

    // ============================================================================
    // MODAL (POPUP) MANAGEMENT
    // ============================================================================
    // Open the add/edit task modal/popup
    
    openModal(edit = null) {
        // If editing, store the task ID; otherwise null for new task
        this.editingId = edit?.id || null;
        
        // If editing, load existing tags; otherwise start with empty array
        this.currentTags = edit ? [...edit.tags] : [];
        
        // Get the form element
        const form = document.getElementById('taskForm');
        
        // Change modal title based on whether adding or editing
        document.getElementById('modalTitle').textContent = edit ? 'Edit Task' : 'Add New Task';
        document.getElementById('submitBtn').textContent = edit ? 'Update Task' : 'Add Task';
        
        // Clear the form
        if (form) form.reset();
        
        // If editing, populate form fields with task data
        if (edit) {
            document.getElementById('taskId').value = edit.id;
            document.getElementById('taskTitle').value = edit.title;
            document.getElementById('taskDescription').value = edit.description;
            document.getElementById('taskStatus').value = edit.status;
            document.getElementById('taskPriority').value = edit.priority;
            document.getElementById('taskDueDate').value = edit.dueDate || '';
        }
        
        // Render any existing tags in the form
        this.renderTags();
        
        // Show the modal by adding 'active' class
        document.getElementById('taskModal').classList.add('active');
        
        // Focus on the title input so user can start typing immediately
        document.getElementById('taskTitle').focus();
    },

    // Close the modal and reset state
    closeModal() {
        // Hide the modal
        document.getElementById('taskModal').classList.remove('active');
        
        // Hide any error messages
        document.getElementById('modalError').classList.remove('visible');
        
        // Reset editing state
        this.editingId = null;
        this.currentTags = [];
    },

    // ============================================================================
    // FORM SUBMISSION
    // ============================================================================
    // Handle adding or updating a task when form is submitted
    
    async handleSubmit(e) {
        // Prevent form from submitting to a server (page reload)
        e.preventDefault();
        
        // Get all form values
        const data = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            tags: this.currentTags
        };

        // Validate all form fields
        // Collect any errors from the validation functions
        const errors = [V.title(data.title), V.desc(data.description), V.status(data.status), V.priority(data.priority), V.date(data.dueDate)].filter(Boolean);
        
        // If there are errors, show the first one and stop
        if (errors.length) return this.showModalError(errors[0]);

        try {
            // Check if we're editing an existing task or adding a new one
            if (this.editingId) {
                // Update existing task: find it and merge new data
                const i = this.tasks.findIndex(t => t.id === this.editingId);
                this.tasks[i] = { ...this.tasks[i], ...data, updatedAt: new Date().toISOString() };
                this.msg('Task updated');
            } else {
                // Create a new task and add to the array
                this.tasks.push(Task(data));
                this.msg('Task added');
            }
            
            // Save to localStorage so data persists
            await Storage.save(this.tasks);
            
            // Close modal and refresh the display
            this.closeModal();
            this.render();
        } catch (err) { 
            // Show error message if something went wrong
            this.showModalError(err.message); 
        }
    },

    // ============================================================================
    // TOGGLE TASK STATUS
    // ============================================================================
    // Cycle to the next status when user clicks the checkmark button
    // Goes: pending -> in-progress -> completed -> pending
    
    async toggleStatus(id) {
        // Find the task by its ID
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        
        // Find current status position and calculate next one
        // Uses modulo (%) to cycle back to beginning after last status
        const next = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % 3];
        
        // Update task with new status and timestamp
        Object.assign(task, { status: next, updatedAt: new Date().toISOString() });
        
        // Save changes to localStorage
        await Storage.save(this.tasks);
        
        // Refresh the display
        this.render();
    },

    // ============================================================================
    // DELETE TASK
    // ============================================================================
    // Remove a task from the list
    
    async deleteTask(id) {
        // Ask user to confirm before deleting (prevents accidental deletions)
        if (!confirm('Delete this task?')) return;
        
        // Filter out the task with the matching ID
        this.tasks = this.tasks.filter(t => t.id !== id);
        
        // Save the updated list to localStorage
        await Storage.save(this.tasks);
        
        // Show success message
        this.msg('Task deleted');
        
        // Refresh the display
        this.render();
    },

    // ============================================================================
    // CLEAR FILTERS
    // ============================================================================
    // Reset all filter inputs to their default values
    
    clearFilters() {
        // Reset each filter input's value to empty
        ['searchInput', 'filterStatus', 'filterPriority', 'filterDueDate', 'filterTags'].forEach(id => document.getElementById(id).value = '');
        
        // Refresh the display (will show all tasks since filters are cleared)
        this.render();
    },

    // ============================================================================
    // FILTER AND SORT TASKS
    // ============================================================================
    // Get tasks that match the current filter settings
    // Also sorts them by status and priority
    
    getFiltered() {
        // Start with all tasks
        let f = [...this.tasks];
        
        // Helper function to get input values by element ID
        const get = id => document.getElementById(id)?.value || '';
        
        // Get search query (convert to lowercase for case-insensitive search)
        const q = get('searchInput').toLowerCase().trim();
        
        // Filter by search query - checks title, description, and tags
        if (q) f = f.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(t => t.includes(q)));
        
        // Filter by status dropdown
        if (get('filterStatus')) f = f.filter(t => t.status === get('filterStatus'));
        
        // Filter by priority dropdown
        if (get('filterPriority')) f = f.filter(t => t.priority === get('filterPriority'));
        
        // Filter by due date
        if (get('filterDueDate')) f = f.filter(t => t.dueDate === get('filterDueDate'));
        
        // Filter by tag (searches in tags array)
        if (get('filterTags')) f = f.filter(t => t.tags.some(t => t.includes(get('filterTags').toLowerCase())));

        // Sort tasks: 
        // 1. Completed tasks go to the bottom
        // 2. Within same status, sort by priority (high first)
        // 3. Within same priority, sort by due date (earliest first)
        f.sort((a, b) => {
            if (a.status === STATUS.COMPLETED !== (b.status === STATUS.COMPLETED)) return (a.status === STATUS.COMPLETED) - (b.status === STATUS.COMPLETED);
            return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueDate && b.dueDate ? new Date(a.dueDate) - new Date(b.dueDate) : !!b.dueDate - !!a.dueDate);
        });
        
        return f;
    },

    // ============================================================================
    // RENDER TASKS
    // ============================================================================
    // Display the filtered/sorted tasks in the HTML
    
    render() {
        // Get the task list container and task count element
        const list = document.getElementById('taskList'), count = document.getElementById('taskCount');
        
        // Get filtered tasks
        const f = this.getFiltered();
        
        // Update task count display
        count.textContent = `${f.length} task${f.length !== 1 ? 's' : ''}`;
        
        // If no tasks match filters, show empty state message
        if (!f.length) {
            list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><p>No tasks found</p></div>`;
            return;
        }

        // Generate HTML for each task and insert into the list
        list.innerHTML = f.map(t => `
            <div class="task-item status-${t.status} priority-${t.priority}" data-id="${t.id}">
                <div class="task-header">
                    <span class="task-title">${this.esc(t.title)}</span>
                    <div class="task-actions">
                        <button class="btn-success" onclick="TaskManager.toggleStatus('${t.id}')">${t.status === STATUS.COMPLETED ? '↩️' : '✓'}</button>
                        <button class="btn-primary" onclick="TaskManager.openModal(TaskManager.tasks.find(t => t.id === '${t.id}'))">✏️</button>
                        <button class="btn-danger" onclick="TaskManager.deleteTask('${t.id}')">🗑️</button>
                    </div>
                </div>
                ${t.description ? `<p class="task-description">${this.esc(t.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="status-badge status-${t.status}">${FORMAT.status(t.status)}</span>
                    <span>Priority: ${FORMAT.priority(t.priority)}</span>
                    ${t.dueDate ? `<span>📅 ${FORMAT.date(t.dueDate)}</span>` : ''}
                    ${t.tags.length ? `<span>${t.tags.map(tag => `<span class="tag">${this.esc(tag)}</span>`).join(' ')}</span>` : ''}
                </div>
            </div>
        `).join('');
    },

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    // Escape HTML special characters to prevent XSS (cross-site scripting) attacks
    // This prevents users from injecting malicious code through task titles/descriptions
    esc(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; },
    
    // Show a temporary success message that disappears after 3 seconds
    msg(text) { const el = document.getElementById('successMessage'); el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 3000); },
    
    // Show a temporary error message that disappears after 5 seconds
    err(text) { const el = document.getElementById('errorMessage'); el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 5000); },
    
    // Show error message inside the modal (stays until user fixes it)
    showModalError(text) { const el = document.getElementById('modalError'); el.textContent = text; el.classList.add('visible'); },

    // ============================================================================
    // CLI-STYLE API
    // ============================================================================
    // These functions allow programmatic access to tasks
    // Can be used from browser console for advanced users
    
    commands: {
        // Add a task programmatically: TaskManager.commands.add({ title: 'My Task', priority: 'high' })
        add: (d) => TaskManager.handleSubmit({ preventDefault: () => {}, target: { elements: { taskTitle: { value: d.title }, taskDescription: { value: d.description || '' }, taskStatus: { value: d.status || 'pending' }, taskPriority: { value: d.priority || 'low' }, taskDueDate: { value: d.dueDate || '' } } } }),
        
        // List tasks with optional filters: TaskManager.commands.list({ status: 'pending', priority: 'high' })
        list: (f = {}) => Storage.get().then(t => t.filter(x => (!f.status || x.status === f.status) && (!f.priority || x.priority === f.priority) && (!f.tag || x.tags.includes(f.tag.toLowerCase())))),
        
        // Update a task by ID: TaskManager.commands.update('task_123...', { title: 'New Title' })
        update: (id, d) => Storage.get().then(t => { const i = t.findIndex(x => x.id === id); if (i >= 0) { t[i] = { ...t[i], ...d }; return Storage.save(t).then(() => t[i]); } }),
        
        // Delete a task by ID: TaskManager.commands.delete('task_123...')
        delete: (id) => Storage.get().then(t => Storage.save(t.filter(x => x.id !== id))),
        
        // Search tasks by text: TaskManager.commands.search('important')
        search: (q) => Storage.get().then(t => { const l = q.toLowerCase(); return t.filter(x => x.title.toLowerCase().includes(l) || x.description.toLowerCase().includes(l)); })
    }
};

// ============================================================================
// APP INITIALIZATION
// ============================================================================

// Wait for the HTML page to fully load, then initialize the TaskManager
document.addEventListener('DOMContentLoaded', () => TaskManager.init());

// Make TaskManager available globally so it can be called from HTML onclick attributes
window.TaskManager = TaskManager;
