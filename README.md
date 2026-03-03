# Task Manager

A browser-based task management utility built with pure JavaScript, featuring CRUD operations, persistent localStorage storage, filtering, and search capabilities.

## Features

- ✅ **Create** - Add new tasks with title, description, status, priority, due date, and tags
- ✅ **Read** - View all tasks with visual priority indicators
- ✅ **Update** - Edit existing tasks via modal form
- ✅ **Delete** - Remove tasks with confirmation dialog
- ✅ **Filter** - Filter by status, priority, due date, or tags
- ✅ **Search** - Real-time search across titles, descriptions, and tags
- ✅ **Toggle Status** - Cycle through pending → in-progress → completed

## Quick Start

1. Open `index.html` in any modern web browser
2. Click "Add New Task" to create your first task
3. Fill in the task details and click "Add Task"

No server or build process required!

## Usage Guide

### Adding a Task

1. Click the **+ Add New Task** button
2. Fill in the required fields:
   - **Title** (required): Task name, max 100 characters
   - **Description** (optional): Detailed task description, max 1000 characters
   - **Status**: Pending, In Progress, or Completed
   - **Priority**: Low, Medium, or High
   - **Due Date**: Optional date picker
   - **Tags**: Type a tag and press Enter to add
3. Click "Add Task" to save

### Managing Tasks

- **Toggle Status**: Click the ✓ button to cycle through statuses
- **Edit**: Click the ✏️ button to modify a task
- **Delete**: Click the 🗑️ button (confirms before deleting)

### Filtering & Search

**Search Bar:**
- Type in the search box to filter tasks by title, description, or tags
- Search is performed in real-time with 300ms debounce

**Filter Section:**
- **Status**: Filter by Pending, In Progress, or Completed
- **Priority**: Filter by High, Medium, or Low
- **Due Date**: Filter by specific due date
- **Tags**: Filter by tag name
- Click "Clear Filters" to reset all filters

### Programmatic API

Access tasks programmatically via the browser console:

```javascript
// Add a task
await TaskManager.commands.add({
  title: 'My New Task',
  description: 'Task description',
  status: 'pending',
  priority: 'high',
  dueDate: '2024-12-31',
  tags: ['work', 'important']
});

// List all tasks
const tasks = await TaskManager.commands.list();

// Filter by status
const pendingTasks = await TaskManager.commands.list({ status: 'pending' });

// Filter by priority
const highPriorityTasks = await TaskManager.commands.list({ priority: 'high' });

// Search tasks
const results = await TaskManager.commands.search('keyword');

// Filter with criteria
const results = await TaskManager.commands.filter({
  status: 'pending',
  priority: 'high',
  tag: 'work'
});

// Update a task
const task = await TaskManager.commands.list()[0];
await TaskManager.commands.update(task.id, {
  title: 'Updated Title',
  status: 'completed'
});

// Delete a task
await TaskManager.commands.delete(taskId);
```

## Data Storage

Tasks are stored in the browser's localStorage under the key `taskManager_tasks`. Data persists across browser sessions and page refreshes.

### Storage Limits
- localStorage typically supports 5-10MB of data
- You'll see a specific error if the quota is exceeded

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript (Promises, arrow functions, template literals)
- localStorage API
- CSS3 (flexbox, gradients, transitions)

Tested in:
- Chrome/Edge (Chromium)
- Firefox
- Safari

## Project Structure

```
task-manager/
├── index.html        # Main HTML file with UI
├── task-manager.js   # JavaScript application logic
├── SPEC.md           # Technical specification
├── README.md         # This file
└── AI_PROMPTS.md     # AI development prompts history
```

## Keyboard Shortcuts

- **Escape**: Close modal dialog
- **Enter** (in tag input): Add tag

## Validation Rules

- Title: Required, 1-100 characters
- Description: Optional, max 1000 characters
- Status: Must be pending, in-progress, or completed
- Priority: Must be low, medium, or high
- Tags: Max 30 characters each, duplicates removed

## Error Handling

The application includes comprehensive error handling:
- Validation errors shown in modal
- Storage errors displayed as toast messages
- Task not found errors handled gracefully

## License

MIT License - Feel free to use and modify as needed.
