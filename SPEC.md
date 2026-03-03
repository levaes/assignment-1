# Task Manager - Technical Specification

## Project Overview

**Project Name:** Browser-Based Task Manager  
**Type:** Single-page Web Application  
**Core Functionality:** A task management utility with CRUD operations, persistent localStorage storage, filtering, and search capabilities.  
**Target Users:** Individual users managing personal tasks in a browser environment.

---

## UI/UX Specification

### Layout Structure

**Page Sections:**
1. **Header** - Title with decorative styling
2. **Controls Section** - Search bar and "Add New Task" button
3. **Filter Section** - Dropdown filters and date picker
4. **Task List Section** - Dynamic task cards display

**Responsive Breakpoints:**
- Desktop: Full horizontal layout (max-width: 1200px centered)
- Mobile (<768px): Stacked vertical controls

### Visual Design

**Color Palette:**
- Primary Gradient: `#667eea` to `#764ba2` (purple-blue gradient)
- Background: Gradient from above
- Cards: White `#ffffff`
- Text Primary: `#333333`
- Text Secondary: `#666666`, `#888888`
- Status Colors:
  - Pending: `#fff3cd` (yellow), `#856404` (text)
  - In Progress: `#cce5ff` (blue), `#004085` (text)
  - Completed: `#d4edda` (green), `#155724` (text)
- Priority Colors:
  - High: `#ff6b6b` (red border)
  - Medium: `#ffa94d` (orange border)
  - Low: `#51cf66` (green border)
- Error: `#ffe0e0` background, `#c00` text
- Success: `#e0ffe0` background, `#060` text

**Typography:**
- Font Family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`
- Headings: 
  - H1: 2.5rem, white, centered
  - H2: Inherits from body
- Body: 14px base
- Task Title: 18px, font-weight 600
- Meta text: 13px

**Spacing:**
- Container padding: 20px
- Card padding: 20px
- Gap between tasks: 15px
- Form group margin: 15px

**Visual Effects:**
- Card shadows: `0 10px 40px rgba(0,0,0,0.2)`
- Hover transforms: `translateY(-2px)` on buttons
- Border radius: 12px on containers, 8px on inputs/buttons
- Left border accent on task cards: 4px solid

### Components

**Task Card:**
- States: default, hover (slight translateX), completed (reduced opacity, green bg)
- Shows: title, description, status badge, priority, due date, tags
- Actions: toggle status, edit, delete buttons

**Modal:**
- Centered overlay with semi-transparent backdrop
- Close on Escape key or outside click
- Form fields with validation feedback

**Tags Input:**
- Chip-style tags with remove button
- Input field for adding new tags

**Filter Controls:**
- Status dropdown (All/Pending/In Progress/Completed)
- Priority dropdown (All/High/Medium/Low)
- Date picker for due date filtering
- Text input for tag filtering

---

## Functionality Specification

### Core Features

**1. Task Properties:**
- `id`: Unique identifier (generated timestamp + random string)
- `title`: String, required, max 100 chars
- `description`: String, optional, max 1000 chars
- `status`: Enum (pending, in-progress, completed), default: pending
- `priority`: Enum (low, medium, high), default: low
- `dueDate`: ISO date string or null
- `tags`: Array of strings, max 30 chars each
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**2. CRUD Operations:**

*Create (Add Task):*
- Opens modal form
- Validates all fields
- Creates task with generated ID and timestamps
- Saves to localStorage
- Shows success message

*Read (List Tasks):*
- Loads from localStorage on init
- Displays all tasks or filtered subset
- Supports search across title, description, tags

*Update (Edit Task):*
- Opens pre-filled modal
- Validates changes
- Updates timestamps
- Saves to localStorage
- Shows success message

*Delete:*
- Confirmation dialog
- Removes from array
- Saves to localStorage
- Shows success message

**3. Additional Commands:**

*Filter:*
- Filter by status (dropdown)
- Filter by priority (dropdown)
- Filter by due date (date picker)
- Filter by tag (text input)

*Search:*
- Real-time search with 300ms debounce
- Searches title, description, tags

*Toggle Status:*
- Cycles through: pending → in-progress → completed → pending

### Data Handling

**Storage:**
- Uses localStorage with key `taskManager_tasks`
- Stores JSON-serialized array of task objects

**Async Operations:**
- All storage operations return Promises
- Proper error handling with try/catch
- Custom TaskError class for typed errors

### Validation

- Title: Required, 1-100 characters
- Description: Optional, max 1000 characters
- Status: Must be valid enum value
- Priority: Must be valid enum value
- Due Date: Must be valid date string
- Tags: Array of strings, trimmed, deduped, max 30 chars each

### Edge Cases

- Empty task list shows empty state message
- localStorage quota exceeded shows specific error
- Invalid dates are rejected
- Duplicate tags are prevented
- XSS prevention via HTML escaping

---

## Technical Architecture

### Modules

1. **Validator** - Input validation utilities
2. **StorageService** - localStorage CRUD operations
3. **TaskFactory** - Task object creation
4. **TaskManager** - Main application logic and UI
5. **TaskError** - Custom error class

### API (Programmatic Access)

```javascript
// Available via TaskManager.commands
TaskManager.commands.add({ title, description, status, priority, dueDate, tags })
TaskManager.commands.list({ status, priority, tag })
TaskManager.commands.update(id, { title, description, status, priority, dueDate, tags })
TaskManager.commands.delete(id)
TaskManager.commands.search(query)
TaskManager.commands.filter({ status, priority, dueDate, tag })
```

---

## Acceptance Criteria

1. ✅ Can add new tasks with all fields
2. ✅ Can edit existing tasks
3. ✅ Can delete tasks with confirmation
4. ✅ Can toggle task status
5. ✅ Tasks persist in localStorage across page refreshes
6. ✅ Can search tasks by title/description/tags
7. ✅ Can filter by status, priority, due date, and tags
8. ✅ Input validation prevents invalid data
9. ✅ Error messages display for failed operations
10. ✅ Success messages display for successful operations
11. ✅ Responsive layout works on mobile and desktop
12. ✅ Keyboard accessibility (Escape to close modal)
