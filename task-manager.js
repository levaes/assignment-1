/**
 * Task Manager Application - Refactored for conciseness
 * Pure JavaScript with localStorage persistence
 */

const STORAGE_KEY = 'taskManager_tasks';
const STATUS = { PENDING: 'pending', IN_PROGRESS: 'in-progress', COMPLETED: 'completed' };
const PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
const STATUS_ORDER = [STATUS.PENDING, STATUS.IN_PROGRESS, STATUS.COMPLETED];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const FORMAT = {
    status: s => ({ pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' }[s] || s),
    priority: p => ({ low: 'Low', medium: 'Medium', high: 'High' }[p] || p),
    date: d => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
};

// Simple validation helpers
const V = {
    title: v => !v?.trim() ? 'Title required' : v.trim().length > 100 ? 'Title too long' : null,
    desc: v => v?.length > 1000 ? 'Description too long' : null,
    status: v => v && !Object.values(STATUS).includes(v) ? 'Invalid status' : null,
    priority: v => v && !Object.values(PRIORITY).includes(v) ? 'Invalid priority' : null,
    date: v => v && isNaN(new Date(v).getTime()) ? 'Invalid date' : null,
    tags: v => Array.isArray(v) ? [...new Set(v.filter(t => typeof t === 'string').map(t => t.trim().toLowerCase()).filter(t => t && t.length <= 30))] : []
};

// Storage service
const Storage = {
    get: async () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
    save: async (tasks) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
        catch (e) { throw e.name === 'QuotaExceededError' ? Error('Storage full') : Error('Save failed'); }
    }
};

// Task factory
const Task = (data) => ({
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    title: data.title, description: data.description || '',
    status: data.status || STATUS.PENDING, priority: data.priority || PRIORITY.LOW,
    dueDate: data.dueDate || null, tags: data.tags || [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
});

// Main TaskManager
const TaskManager = {
    tasks: [], currentTags: [], editingId: null,

    async init() {
        this.tasks = await Storage.get();
        this.render();
        this.bindEvents();
    },

    bindEvents() {
        const on = (id, e, fn) => document.getElementById(id)?.addEventListener(e, fn);
        on('searchInput', 'input', this.debounce(() => this.render(), 300));
        ['filterStatus', 'filterPriority', 'filterDueDate'].forEach(id => on(id, 'change', () => this.render()));
        on('filterTags', 'input', this.debounce(() => this.render(), 300));
        on('tagInput', 'keydown', e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), this.addTag(e.target)));
        document.getElementById('taskModal')?.addEventListener('click', e => e.target.id === 'taskModal' && this.closeModal());
        document.addEventListener('keydown', e => e.key === 'Escape' && this.closeModal());
    },

    debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },

    addTag(input) {
        const tag = input.value.trim().toLowerCase();
        if (tag && !this.currentTags.includes(tag) && tag.length <= 30) {
            this.currentTags.push(tag);
            this.renderTags();
        }
        input.value = '';
    },

    removeTag(tag) { this.currentTags = this.currentTags.filter(t => t !== tag); this.renderTags(); },

    renderTags() {
        const c = document.getElementById('tagsContainer'), i = document.getElementById('tagInput');
        c?.querySelectorAll('.tag-chip').forEach(t => t.remove());
        this.currentTags.forEach(t => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${this.esc(t)} <button onclick="TaskManager.removeTag('${this.esc(t)}')">&times;</button>`;
            c?.insertBefore(chip, i);
        });
    },

    openModal(edit = null) {
        this.editingId = edit?.id || null;
        this.currentTags = edit ? [...edit.tags] : [];
        const form = document.getElementById('taskForm');
        document.getElementById('modalTitle').textContent = edit ? 'Edit Task' : 'Add New Task';
        document.getElementById('submitBtn').textContent = edit ? 'Update Task' : 'Add Task';
        if (form) form.reset();
        if (edit) {
            document.getElementById('taskId').value = edit.id;
            document.getElementById('taskTitle').value = edit.title;
            document.getElementById('taskDescription').value = edit.description;
            document.getElementById('taskStatus').value = edit.status;
            document.getElementById('taskPriority').value = edit.priority;
            document.getElementById('taskDueDate').value = edit.dueDate || '';
        }
        this.renderTags();
        document.getElementById('taskModal').classList.add('active');
        document.getElementById('taskTitle').focus();
    },

    closeModal() {
        document.getElementById('taskModal').classList.remove('active');
        document.getElementById('modalError').classList.remove('visible');
        this.editingId = null;
        this.currentTags = [];
    },

    async handleSubmit(e) {
        e.preventDefault();
        const data = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            tags: this.currentTags
        };

        // Validate
        const errors = [V.title(data.title), V.desc(data.description), V.status(data.status), V.priority(data.priority), V.date(data.dueDate)].filter(Boolean);
        if (errors.length) return this.showModalError(errors[0]);

        try {
            if (this.editingId) {
                const i = this.tasks.findIndex(t => t.id === this.editingId);
                this.tasks[i] = { ...this.tasks[i], ...data, updatedAt: new Date().toISOString() };
                this.msg('Task updated');
            } else {
                this.tasks.push(Task(data));
                this.msg('Task added');
            }
            await Storage.save(this.tasks);
            this.closeModal();
            this.render();
        } catch (err) { this.showModalError(err.message); }
    },

    async toggleStatus(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        const next = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % 3];
        Object.assign(task, { status: next, updatedAt: new Date().toISOString() });
        await Storage.save(this.tasks);
        this.render();
    },

    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        this.tasks = this.tasks.filter(t => t.id !== id);
        await Storage.save(this.tasks);
        this.msg('Task deleted');
        this.render();
    },

    clearFilters() {
        ['searchInput', 'filterStatus', 'filterPriority', 'filterDueDate', 'filterTags'].forEach(id => document.getElementById(id).value = '');
        this.render();
    },

    getFiltered() {
        let f = [...this.tasks];
        const get = id => document.getElementById(id)?.value || '';
        const q = get('searchInput').toLowerCase().trim();
        if (q) f = f.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(t => t.includes(q)));
        if (get('filterStatus')) f = f.filter(t => t.status === get('filterStatus'));
        if (get('filterPriority')) f = f.filter(t => t.priority === get('filterPriority'));
        if (get('filterDueDate')) f = f.filter(t => t.dueDate === get('filterDueDate'));
        if (get('filterTags')) f = f.filter(t => t.tags.some(t => t.includes(get('filterTags').toLowerCase())));

        f.sort((a, b) => {
            if (a.status === STATUS.COMPLETED !== (b.status === STATUS.COMPLETED)) return (a.status === STATUS.COMPLETED) - (b.status === STATUS.COMPLETED);
            return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueDate && b.dueDate ? new Date(a.dueDate) - new Date(b.dueDate) : !!b.dueDate - !!a.dueDate);
        });
        return f;
    },

    render() {
        const list = document.getElementById('taskList'), count = document.getElementById('taskCount');
        const f = this.getFiltered();
        count.textContent = `${f.length} task${f.length !== 1 ? 's' : ''}`;
        
        if (!f.length) {
            list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><p>No tasks found</p></div>`;
            return;
        }

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

    esc(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; },
    msg(text) { const el = document.getElementById('successMessage'); el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 3000); },
    err(text) { const el = document.getElementById('errorMessage'); el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 5000); },
    showModalError(text) { const el = document.getElementById('modalError'); el.textContent = text; el.classList.add('visible'); },

    // CLI-style API
    commands: {
        add: (d) => TaskManager.handleSubmit({ preventDefault: () => {}, target: { elements: { taskTitle: { value: d.title }, taskDescription: { value: d.description || '' }, taskStatus: { value: d.status || 'pending' }, taskPriority: { value: d.priority || 'low' }, taskDueDate: { value: d.dueDate || '' } } } }),
        list: (f = {}) => Storage.get().then(t => t.filter(x => (!f.status || x.status === f.status) && (!f.priority || x.priority === f.priority) && (!f.tag || x.tags.includes(f.tag.toLowerCase())))),
        update: (id, d) => Storage.get().then(t => { const i = t.findIndex(x => x.id === id); if (i >= 0) { t[i] = { ...t[i], ...d }; return Storage.save(t).then(() => t[i]); } }),
        delete: (id) => Storage.get().then(t => Storage.save(t.filter(x => x.id !== id))),
        search: (q) => Storage.get().then(t => { const l = q.toLowerCase(); return t.filter(x => x.title.toLowerCase().includes(l) || x.description.toLowerCase().includes(l)); })
    }
};

document.addEventListener('DOMContentLoaded', () => TaskManager.init());
window.TaskManager = TaskManager;
