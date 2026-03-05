"use strict";
var taskManager = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/taskManager.ts
  var taskManager_exports = {};
  __export(taskManager_exports, {
    TaskManager: () => TaskManager,
    createCategory: () => createCategory,
    createDependency: () => createDependency,
    createTask: () => createTask,
    taskManager: () => taskManager
  });

  // src/types.ts
  var TaskStatus = /* @__PURE__ */ ((TaskStatus2) => {
    TaskStatus2["PENDING"] = "pending";
    TaskStatus2["IN_PROGRESS"] = "in-progress";
    TaskStatus2["COMPLETED"] = "completed";
    return TaskStatus2;
  })(TaskStatus || {});
  var TaskPriority = /* @__PURE__ */ ((TaskPriority2) => {
    TaskPriority2["LOW"] = "low";
    TaskPriority2["MEDIUM"] = "medium";
    TaskPriority2["HIGH"] = "high";
    return TaskPriority2;
  })(TaskPriority || {});
  function isTaskStatus(value) {
    return Object.values(TaskStatus).includes(value);
  }
  function isTaskPriority(value) {
    return Object.values(TaskPriority).includes(value);
  }
  function isTask(value) {
    return typeof value === "object" && value !== null && "id" in value && "title" in value && "status" in value;
  }
  function isCategory(value) {
    return typeof value === "object" && value !== null && "id" in value && "name" in value && "color" in value;
  }

  // src/utils.ts
  function debounce(fn, ms = 300) {
    let timerId = null;
    return function(...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        fn.apply(this, args);
        timerId = null;
      }, ms);
    };
  }
  function filterBy(items, predicate) {
    return items.filter(predicate);
  }
  function searchBy(items, query, fields) {
    if (!query.trim()) {
      return items;
    }
    const lowerQuery = query.toLowerCase().trim();
    return items.filter((item) => {
      return fields.some((field) => {
        const value = item[field];
        if (value === null || value === void 0) {
          return false;
        }
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });
  }
  var formatStatus = (status) => ({
    ["pending" /* PENDING */]: "Pending",
    ["in-progress" /* IN_PROGRESS */]: "In Progress",
    ["completed" /* COMPLETED */]: "Completed"
  })[status] || status;
  var formatPriority = (priority) => ({
    ["low" /* LOW */]: "Low",
    ["medium" /* MEDIUM */]: "Medium",
    ["high" /* HIGH */]: "High"
  })[priority] || priority;
  var formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  function generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < /* @__PURE__ */ new Date();
  }
  function getDaysUntil(date) {
    if (!date) return null;
    const diff = new Date(date).getTime() - (/* @__PURE__ */ new Date()).getTime();
    return Math.ceil(diff / (1e3 * 60 * 60 * 24));
  }

  // src/storage.ts
  var STORAGE_KEYS = {
    TASKS: "taskManager_tasks",
    CATEGORIES: "taskManager_categories",
    DEPENDENCIES: "taskManager_dependencies",
    SETTINGS: "taskManager_settings"
  };
  var StorageService = class {
    constructor(prefix = "taskManager_") {
      this.prefix = prefix;
    }
    /**
     * Load data from localStorage
     */
    async get(key) {
      try {
        const fullKey = `${this.prefix}${key}`;
        const data = localStorage.getItem(fullKey);
        console.log(`[Storage] get(${key}) - raw data:`, data ? data.substring(0, 100) + "..." : "null/empty");
        if (!data) {
          return [];
        }
        const parsed = JSON.parse(data);
        return parsed.filter((item) => {
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
    async set(key, data) {
      const fullKey = `${this.prefix}${key}`;
      console.log(`[Storage] set(${key}) - items count:`, data.length);
      try {
        localStorage.setItem(fullKey, JSON.stringify(data));
        console.log(`[Storage] set(${key}) - success`);
      } catch (e) {
        console.error(`[Storage] set(${key}) error:`, e);
        const error = e;
        throw error.name === "QuotaExceededError" ? Error("Storage full - please delete some tasks") : Error("Save failed");
      }
    }
    /**
     * Remove data from localStorage
     */
    async remove(key) {
      const fullKey = `${this.prefix}${key}`;
      localStorage.removeItem(fullKey);
    }
    /**
     * Clear all stored data
     */
    async clearAll() {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(`${this.prefix}${key}`);
      });
    }
  };
  var TaskStorageService = class extends StorageService {
    /**
     * Get all tasks
     */
    async getTasks() {
      return this.get(STORAGE_KEYS.TASKS);
    }
    /**
     * Save all tasks
     */
    async saveTasks(tasks) {
      return this.set(STORAGE_KEYS.TASKS, tasks);
    }
    /**
     * Get task by ID
     */
    async getTaskById(id) {
      const tasks = await this.getTasks();
      return tasks.find((t) => t.id === id) || null;
    }
    /**
     * Add a new task
     */
    async addTask(task) {
      const tasks = await this.getTasks();
      tasks.push(task);
      await this.saveTasks(tasks);
    }
    /**
     * Update a task
     */
    async updateTask(id, updates) {
      const tasks = await this.getTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return null;
      }
      tasks[index] = { ...tasks[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.saveTasks(tasks);
      return tasks[index];
    }
    /**
     * Delete a task
     */
    async deleteTask(id) {
      const tasks = await this.getTasks();
      const filtered = tasks.filter((t) => t.id !== id);
      if (filtered.length === tasks.length) {
        return false;
      }
      await this.saveTasks(filtered);
      return true;
    }
    /**
     * Filter tasks
     */
    async filterTasks(filter) {
      let tasks = await this.getTasks();
      if (filter.status) {
        tasks = tasks.filter((t) => t.status === filter.status);
      }
      if (filter.priority) {
        tasks = tasks.filter((t) => t.priority === filter.priority);
      }
      if (filter.categoryId) {
        tasks = tasks.filter((t) => t.categoryId === filter.categoryId);
      }
      if (filter.tag) {
        tasks = tasks.filter((t) => t.tags.includes(filter.tag));
      }
      if (filter.dueDate) {
        tasks = tasks.filter((t) => t.dueDate === filter.dueDate);
      }
      if (filter.dateFrom) {
        tasks = tasks.filter((t) => t.dueDate && t.dueDate >= filter.dateFrom);
      }
      if (filter.dateTo) {
        tasks = tasks.filter((t) => t.dueDate && t.dueDate <= filter.dateTo);
      }
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        tasks = tasks.filter(
          (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return tasks;
    }
    /**
     * Sort tasks
     */
    sortTasks(tasks, sort) {
      const sorted = [...tasks].sort((a, b) => {
        let aVal;
        let bVal;
        switch (sort.field) {
          case "title":
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case "priority":
            aVal = { high: 0, medium: 1, low: 2 }[a.priority];
            bVal = { high: 0, medium: 1, low: 2 }[b.priority];
            break;
          case "status":
            aVal = { pending: 0, "in-progress": 1, completed: 2 }[a.status];
            bVal = { pending: 0, "in-progress": 1, completed: 2 }[b.status];
            break;
          case "dueDate":
          case "createdAt":
          case "updatedAt":
            aVal = a[sort.field] || "";
            bVal = b[sort.field] || "";
            break;
        }
        if (aVal === null || aVal === void 0) return 1;
        if (bVal === null || bVal === void 0) return -1;
        if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
        return 0;
      });
      return sorted;
    }
  };
  var CategoryStorageService = class extends StorageService {
    /**
     * Get all categories
     */
    async getCategories() {
      return this.get(STORAGE_KEYS.CATEGORIES);
    }
    /**
     * Save all categories
     */
    async saveCategories(categories) {
      return this.set(STORAGE_KEYS.CATEGORIES, categories);
    }
    /**
     * Add a new category
     */
    async addCategory(category) {
      const categories = await this.getCategories();
      categories.push(category);
      await this.saveCategories(categories);
    }
    /**
     * Update a category
     */
    async updateCategory(id, updates) {
      const categories = await this.getCategories();
      const index = categories.findIndex((c) => c.id === id);
      if (index === -1) {
        return null;
      }
      categories[index] = { ...categories[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.saveCategories(categories);
      return categories[index];
    }
    /**
     * Delete a category
     */
    async deleteCategory(id) {
      const categories = await this.getCategories();
      const filtered = categories.filter((c) => c.id !== id);
      if (filtered.length === categories.length) {
        return false;
      }
      await this.saveCategories(filtered);
      return true;
    }
  };
  var DependencyStorageService = class extends StorageService {
    /**
     * Get all dependencies
     */
    async getDependencies() {
      return this.get(STORAGE_KEYS.DEPENDENCIES);
    }
    /**
     * Save all dependencies
     */
    async saveDependencies(dependencies) {
      return this.set(STORAGE_KEYS.DEPENDENCIES, dependencies);
    }
    /**
     * Add a dependency
     */
    async addDependency(dependency) {
      const deps = await this.getDependencies();
      const exists = deps.some(
        (d) => d.taskId === dependency.taskId && d.dependsOnTaskId === dependency.dependsOnTaskId
      );
      if (!exists) {
        deps.push(dependency);
        await this.saveDependencies(deps);
      }
    }
    /**
     * Remove a dependency
     */
    async removeDependency(taskId, dependsOnTaskId) {
      const deps = await this.getDependencies();
      const filtered = deps.filter(
        (d) => !(d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId)
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
    async getDependenciesForTask(taskId) {
      const deps = await this.getDependencies();
      return deps.filter((d) => d.taskId === taskId);
    }
    /**
     * Get tasks that depend on a task
     */
    async getDependentsForTask(taskId) {
      const deps = await this.getDependencies();
      return deps.filter((d) => d.dependsOnTaskId === taskId);
    }
  };
  var storage = new TaskStorageService();
  var categoryStorage = new CategoryStorageService();
  var dependencyStorage = new DependencyStorageService();

  // src/taskManager.ts
  var Validators = {
    title: (v) => {
      const val = v;
      if (!val?.trim()) return "Title required";
      if (val.trim().length > 100) return "Title too long (max 100 characters)";
      return null;
    },
    description: (v) => {
      const val = v;
      if (val && val.length > 1e3) return "Description too long (max 1000 characters)";
      return null;
    },
    status: (v) => {
      const val = v;
      if (val && !isTaskStatus(val)) return "Invalid status";
      return null;
    },
    priority: (v) => {
      const val = v;
      if (val && !isTaskPriority(val)) return "Invalid priority";
      return null;
    },
    date: (v) => {
      const val = v;
      if (val && isNaN(new Date(val).getTime())) return "Invalid date";
      return null;
    },
    tags: (v) => {
      const val = v;
      if (!Array.isArray(val)) return "Tags must be an array";
      if (val.some((t) => typeof t !== "string")) return "All tags must be strings";
      if (val.some((t) => t.length > 30)) return "Tags must be under 30 characters";
      return null;
    },
    categoryId: (v) => {
      const val = v;
      if (val && typeof val !== "string") return "Invalid category ID";
      return null;
    }
  };
  function createTask(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: generateId("task"),
      title: data.title.trim(),
      description: data.description?.trim() || "",
      status: data.status || "pending" /* PENDING */,
      priority: data.priority || "low" /* LOW */,
      dueDate: data.dueDate || null,
      tags: processTags(data.tags),
      categoryId: data.categoryId || null,
      recurring: data.recurring || {
        enabled: false,
        frequency: "weekly" /* WEEKLY */,
        interval: 1,
        endDate: null,
        nextOccurrence: null
      },
      dependsOn: data.dependsOn || [],
      createdAt: now,
      updatedAt: now
    };
  }
  function processTags(tags) {
    if (!Array.isArray(tags)) return [];
    return [...new Set(
      tags.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase()).filter((t) => t && t.length <= 30)
    )];
  }
  function createCategory(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: generateId("category"),
      name: data.name.trim(),
      color: data.color,
      description: data.description?.trim() || "",
      parentId: data.parentId || null,
      priority: data.priority,
      createdAt: now,
      updatedAt: now
    };
  }
  function createDependency(taskId, dependsOnTaskId) {
    return {
      id: generateId("dep"),
      taskId,
      dependsOnTaskId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  var TaskManager = class {
    constructor() {
      // In-memory storage
      this.tasks = [];
      this.categories = [];
      this.dependencies = [];
      // Form state
      this.currentTags = [];
      this.editingId = null;
      this.eventsBound = false;
      // Current filter and sort
      this.currentFilter = {};
      this.currentSort = {
        field: "status" /* STATUS */,
        direction: "asc" /* ASC */
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
            const index = this.tasks.findIndex((t) => t.id === id);
            if (index !== -1) {
              this.tasks[index] = result;
            }
            this.render();
          }
          return result;
        },
        delete: async (id) => {
          await this.taskStorage.deleteTask(id);
          this.tasks = this.tasks.filter((t) => t.id !== id);
          this.render();
        },
        search: async (query) => {
          return searchBy(this.tasks, query, ["title", "description", "tags"]);
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
      console.log("[TaskManager] Initializing...");
      try {
        this.tasks = await this.taskStorage.getTasks();
        this.categories = await this.categoryStorage.getCategories();
        this.dependencies = await this.dependencyStorage.getDependencies();
        await this.processRecurringTasks();
        console.log(`[TaskManager] Loaded ${this.tasks.length} tasks, ${this.categories.length} categories`);
        this.render();
        console.log("[TaskManager] Render complete");
        this.bindEvents();
        console.log("[TaskManager] Events bound successfully");
      } catch (e) {
        console.error("[TaskManager] Init error:", e);
      }
    }
    // ============================================================================
    // EVENT BINDING
    // ============================================================================
    bindEvents() {
      // Prevent duplicate event binding
      if (this.eventsBound) {
        console.log("[TaskManager] Events already bound, skipping");
        return;
      }
      this.eventsBound = true;
      console.log("[TaskManager] Binding events...");
      const on = (id, e, fn) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener(e, fn);
        } else {
          console.warn(`[TaskManager] WARNING: Element #${id} not found`);
        }
      };
      on("searchInput", "input", debounce(() => this.render(), 300));
      ["filterStatus", "filterPriority", "filterDueDate", "filterCategory"].forEach((id) => {
        on(id, "change", () => this.render());
      });
      on("filterTags", "input", debounce(() => this.render(), 300));
      on("sortField", "change", () => {
        this.updateSort();
        this.render();
      });
      on("sortDirection", "change", () => {
        this.updateSort();
        this.render();
      });
      on("tagInput", "keydown", (e) => {
        const event = e;
        if (event.key === "Enter" || event.key === ",") {
          event.preventDefault();
          const input = event.target;
          this.addTag(input);
        }
      });
      document.getElementById("taskModal")?.addEventListener("click", (e) => {
        const event = e;
        if (event.target instanceof HTMLElement && event.target.id === "taskModal") {
          this.closeModal();
        }
      });
      document.addEventListener("keydown", (e) => {
        const event = e;
        if (event.key === "Escape") {
          this.closeModal();
        }
      });
      const form = document.getElementById("taskForm");
      if (form) {
        form.addEventListener("submit", (e) => {
          this.handleSubmit(e);
        });
      }
      const categoryForm = document.getElementById("categoryForm");
      if (categoryForm) {
        categoryForm.addEventListener("submit", (e) => {
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
      input.value = "";
    }
    removeTag(tag) {
      this.currentTags = this.currentTags.filter((t) => t !== tag);
      this.renderTags();
    }
    renderTags() {
      const container = document.getElementById("tagsContainer");
      const input = document.getElementById("tagInput");
      if (!container) return;
      container.querySelectorAll(".tag-chip").forEach((t) => t.remove());
      this.currentTags.forEach((t) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
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
      const form = document.getElementById("taskForm");
      const titleEl = document.getElementById("modalTitle");
      const submitBtn = document.getElementById("submitBtn");
      if (titleEl) titleEl.textContent = edit ? "Edit Task" : "Add New Task";
      if (submitBtn) submitBtn.textContent = edit ? "Update Task" : "Add Task";
      if (form) form.reset();
      if (edit) {
        this.setFormValue("taskId", edit.id);
        this.setFormValue("taskTitle", edit.title);
        this.setFormValue("taskDescription", edit.description);
        this.setFormValue("taskStatus", edit.status);
        this.setFormValue("taskPriority", edit.priority);
        this.setFormValue("taskDueDate", edit.dueDate || "");
        if (edit.recurring?.enabled) {
          this.setFormValue("recurringEnabled", "true");
          this.setFormValue("recurringFrequency", edit.recurring.frequency);
          this.setFormValue("recurringInterval", String(edit.recurring.interval));
        }
      }
      this.renderTags();
      const modal = document.getElementById("taskModal");
      if (modal) modal.classList.add("active");
      const titleInput = document.getElementById("taskTitle");
      if (titleInput) titleInput.focus();
    }
    closeModal() {
      const modal = document.getElementById("taskModal");
      if (modal) modal.classList.remove("active");
      const errorEl = document.getElementById("modalError");
      if (errorEl) errorEl.classList.remove("visible");
      this.editingId = null;
      this.currentTags = [];
    }
    // Open modal for editing by task ID (more reliable than passing object)
    openModalById(taskId) {
      const task = this.tasks.find((t) => t.id === taskId);
      if (task) {
        this.openModal(task);
      }
    }
    setFormValue(id, value) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
    // ============================================================================
    // FORM SUBMISSION
    // ============================================================================
    async handleSubmit(e) {
      e.preventDefault();
      const data = {
        title: document.getElementById("taskTitle")?.value || "",
        description: document.getElementById("taskDescription")?.value || "",
        status: document.getElementById("taskStatus")?.value || "pending" /* PENDING */,
        priority: document.getElementById("taskPriority")?.value || "low" /* LOW */,
        dueDate: document.getElementById("taskDueDate")?.value || null,
        tags: this.currentTags,
        categoryId: document.getElementById("taskCategory")?.value || null,
        dependsOn: this.getSelectedDependencies()
      };
      const recurringEnabled = document.getElementById("recurringEnabled")?.checked;
      if (recurringEnabled) {
        const frequency = document.getElementById("recurringFrequency")?.value || "weekly" /* WEEKLY */;
        const interval = parseInt(document.getElementById("recurringInterval")?.value || "1", 10);
        data.recurring = {
          enabled: true,
          frequency,
          interval,
          endDate: null,
          nextOccurrence: this.calculateNextOccurrence(frequency, interval)
        };
      }
      const errors = this.validateTask(data);
      if (errors.length > 0) {
        this.showModalError(errors[0]);
        return;
      }
      try {
        if (this.editingId) {
          const index = this.tasks.findIndex((t) => t.id === this.editingId);
          if (index !== -1) {
            const updated = {
              ...this.tasks[index],
              ...data,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            this.tasks[index] = updated;
            this.msg("Task updated");
            await this.taskStorage.saveTasks(this.tasks);
            this.closeModal();
            this.render();
            return;
          }
        } else {
          const task = createTask(data);
          this.tasks.push(task);
          this.msg("Task added");
          await this.taskStorage.saveTasks(this.tasks);
          this.closeModal();
          this.render();
        }
      } catch (err) {
        this.showModalError(err instanceof Error ? err.message : "An error occurred");
      }
    }
    getSelectedDependencies() {
      const checkboxes = document.querySelectorAll(".dependency-checkbox:checked");
      return Array.from(checkboxes).map((cb) => cb.value);
    }
    validateTask(data) {
      const errors = [];
      const titleError = Validators.title(data.title);
      if (titleError) errors.push(titleError);
      const descError = Validators.description(data.description);
      if (descError) errors.push(descError);
      const statusError = Validators.status(data.status);
      if (statusError) errors.push(statusError);
      const priorityError = Validators.priority(data.priority);
      if (priorityError) errors.push(priorityError);
      const dateError = Validators.date(data.dueDate);
      if (dateError) errors.push(dateError);
      const tagsError = Validators.tags(data.tags);
      if (tagsError) errors.push(tagsError);
      return errors;
    }
    // ============================================================================
    // TASK OPERATIONS
    // ============================================================================
    async toggleStatus(id) {
      const task = this.tasks.find((t) => t.id === id);
      if (!task) return;
      const statusOrder = [
        "pending" /* PENDING */,
        "in-progress" /* IN_PROGRESS */,
        "completed" /* COMPLETED */
      ];
      const currentIndex = statusOrder.indexOf(task.status);
      const next = statusOrder[(currentIndex + 1) % 3];
      task.status = next;
      task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (next === "completed" /* COMPLETED */ && task.recurring?.enabled) {
        await this.createRecurringTask(task);
      }
      await this.taskStorage.saveTasks(this.tasks);
      this.render();
    }
    async deleteTask(id) {
      if (!confirm("Delete this task?")) return;
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.dependencies = this.dependencies.filter(
        (d) => d.taskId !== id && d.dependsOnTaskId !== id
      );
      await this.taskStorage.saveTasks(this.tasks);
      await this.dependencyStorage.saveDependencies(this.dependencies);
      this.msg("Task deleted");
      this.render();
    }
    // ============================================================================
    // RECURRING TASKS
    // ============================================================================
    calculateNextOccurrence(frequency, interval) {
      const now = /* @__PURE__ */ new Date();
      let next;
      switch (frequency) {
        case "daily" /* DAILY */:
          next = new Date(now);
          next.setDate(next.getDate() + interval);
          break;
        case "weekly" /* WEEKLY */:
          next = new Date(now);
          next.setDate(next.getDate() + 7 * interval);
          break;
        case "biweekly" /* BIWEEKLY */:
          next = new Date(now);
          next.setDate(next.getDate() + 14 * interval);
          break;
        case "monthly" /* MONTHLY */:
          next = new Date(now);
          next.setMonth(next.getMonth() + interval);
          break;
        case "yearly" /* YEARLY */:
          next = new Date(now);
          next.setFullYear(next.getFullYear() + interval);
          break;
        default:
          next = new Date(now);
          next.setDate(next.getDate() + 7 * interval);
      }
      return next.toISOString();
    }
    async createRecurringTask(completedTask) {
      if (!completedTask.recurring?.enabled) return;
      const { frequency, interval, endDate } = completedTask.recurring;
      if (endDate) {
        const nextOccurrence = this.calculateNextOccurrence(frequency, interval);
        if (new Date(nextOccurrence) > new Date(endDate)) {
          return;
        }
      }
      const newTask = createTask({
        title: completedTask.title,
        description: completedTask.description,
        status: "pending" /* PENDING */,
        priority: completedTask.priority,
        dueDate: this.calculateNextOccurrence(frequency, interval),
        tags: completedTask.tags,
        categoryId: completedTask.categoryId,
        dependsOn: []
      });
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
      const now = /* @__PURE__ */ new Date();
      for (const task of this.tasks) {
        if (task.recurring?.enabled && task.recurring.nextOccurrence) {
          const nextDate = new Date(task.recurring.nextOccurrence);
          if (nextDate <= now && task.status !== "pending" /* PENDING */) {
            await this.createRecurringTask(task);
          }
        }
      }
    }
    // ============================================================================
    // TASK DEPENDENCIES
    // ============================================================================
    async addDependency(taskId, dependsOnTaskId) {
      if (await this.wouldCreateCircularDependency(taskId, dependsOnTaskId)) {
        throw new Error("Cannot add dependency: would create circular reference");
      }
      const dependency = createDependency(taskId, dependsOnTaskId);
      await this.dependencyStorage.addDependency(dependency);
      this.dependencies = await this.dependencyStorage.getDependencies();
    }
    async wouldCreateCircularDependency(taskId, dependsOnTaskId) {
      const visited = /* @__PURE__ */ new Set();
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
        const deps = this.dependencies.filter((d) => d.dependsOnTaskId === current);
        for (const dep of deps) {
          stack.push(dep.taskId);
        }
      }
      return false;
    }
    getBlockingTasks(taskId) {
      const depIds = this.dependencies.filter((d) => d.taskId === taskId).map((d) => d.dependsOnTaskId);
      return this.tasks.filter((t) => depIds.includes(t.id) && t.status !== "completed" /* COMPLETED */);
    }
    // ============================================================================
    // FILTER AND SORT
    // ============================================================================
    updateFilter() {
      this.currentFilter = {
        status: this.getFilterValue("filterStatus") || null,
        priority: this.getFilterValue("filterPriority") || null,
        dueDate: this.getFilterValue("filterDueDate") || null,
        tag: this.getFilterValue("filterTags") || null,
        categoryId: this.getFilterValue("filterCategory") || null,
        searchQuery: this.getFilterValue("searchInput") || null
      };
    }
    updateSort() {
      const field = this.getFilterValue("sortField") || "status" /* STATUS */;
      const direction = this.getFilterValue("sortDirection") || "asc" /* ASC */;
      this.currentSort = { field, direction };
    }
    getFilterValue(id) {
      const el = document.getElementById(id);
      return el?.value || "";
    }
    getFiltered() {
      this.updateFilter();
      this.updateSort();
      let result = [...this.tasks];
      if (this.currentFilter.searchQuery) {
        result = searchBy(result, this.currentFilter.searchQuery, ["title", "description", "tags"]);
      }
      if (this.currentFilter.status) {
        result = filterBy(result, (t) => t.status === this.currentFilter.status);
      }
      if (this.currentFilter.priority) {
        result = filterBy(result, (t) => t.priority === this.currentFilter.priority);
      }
      if (this.currentFilter.categoryId) {
        result = filterBy(result, (t) => t.categoryId === this.currentFilter.categoryId);
      }
      if (this.currentFilter.tag) {
        result = filterBy(result, (t) => t.tags.includes(this.currentFilter.tag));
      }
      if (this.currentFilter.dueDate) {
        result = filterBy(result, (t) => t.dueDate === this.currentFilter.dueDate);
      }
      result = this.taskStorage.sortTasks(result, this.currentSort);
      const completed = [];
      const notCompleted = [];
      result.forEach((t) => {
        if (t.status === "completed" /* COMPLETED */) {
          completed.push(t);
        } else {
          notCompleted.push(t);
        }
      });
      return [...notCompleted, ...completed];
    }
    clearFilters() {
      ["searchInput", "filterStatus", "filterPriority", "filterDueDate", "filterTags", "filterCategory"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
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
          ["low" /* LOW */]: 0,
          ["medium" /* MEDIUM */]: 0,
          ["high" /* HIGH */]: 0
        },
        byCategory: {},
        byTag: {},
        completionRate: 0,
        upcomingDue: 0
      };
      const now = /* @__PURE__ */ new Date();
      this.tasks.forEach((task) => {
        switch (task.status) {
          case "pending" /* PENDING */:
            stats.pending++;
            break;
          case "in-progress" /* IN_PROGRESS */:
            stats.inProgress++;
            break;
          case "completed" /* COMPLETED */:
            stats.completed++;
            break;
        }
        stats.byPriority[task.priority]++;
        if (task.categoryId) {
          stats.byCategory[task.categoryId] = (stats.byCategory[task.categoryId] || 0) + 1;
        }
        task.tags.forEach((tag) => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
        if (task.dueDate && isOverdue(task.dueDate) && task.status !== "completed" /* COMPLETED */) {
          stats.overdue++;
        }
        if (task.dueDate && !isOverdue(task.dueDate)) {
          const days = getDaysUntil(task.dueDate);
          if (days !== null && days <= 7 && task.status !== "completed" /* COMPLETED */) {
            stats.upcomingDue++;
          }
        }
      });
      stats.completionRate = stats.total > 0 ? stats.completed / stats.total * 100 : 0;
      return stats;
    }
    // ============================================================================
    // CATEGORY MANAGEMENT
    // ============================================================================
    async handleCategorySubmit(e) {
      e.preventDefault();
      const data = {
        name: document.getElementById("categoryName")?.value || "",
        color: document.getElementById("categoryColor")?.value || "#667eea",
        description: document.getElementById("categoryDescription")?.value || "",
        priority: document.getElementById("categoryPriority")?.value || void 0
      };
      if (!data.name.trim()) {
        this.showError("Category name is required");
        return;
      }
      const category = createCategory(data);
      this.categories.push(category);
      await this.categoryStorage.saveCategories(this.categories);
      this.msg("Category created");
      this.renderCategories();
      this.closeCategoryModal();
    }
    openCategoryModal(edit = null) {
      const modal = document.getElementById("categoryModal");
      const titleEl = document.getElementById("categoryModalTitle");
      if (titleEl) titleEl.textContent = edit ? "Edit Category" : "Add Category";
      const form = document.getElementById("categoryForm");
      if (form) form.reset();
      if (edit) {
        this.setFormValue("categoryId", edit.id);
        this.setFormValue("categoryName", edit.name);
        this.setFormValue("categoryColor", edit.color);
        this.setFormValue("categoryDescription", edit.description || "");
        if (edit.priority) {
          this.setFormValue("categoryPriority", edit.priority);
        }
      }
      if (modal) modal.classList.add("active");
    }
    closeCategoryModal() {
      const modal = document.getElementById("categoryModal");
      if (modal) modal.classList.remove("active");
    }
    async deleteCategory(id) {
      if (!confirm("Delete this category?")) return;
      this.categories = this.categories.filter((c) => c.id !== id);
      this.tasks.forEach((task) => {
        if (task.categoryId === id) {
          task.categoryId = null;
        }
      });
      await this.categoryStorage.saveCategories(this.categories);
      await this.taskStorage.saveTasks(this.tasks);
      this.msg("Category deleted");
      this.renderCategories();
    }
    getCategoryById(id) {
      return this.categories.find((c) => c.id === id);
    }
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      console.log("[TaskManager] Rendering tasks...");
      const list = document.getElementById("taskList");
      const count = document.getElementById("taskCount");
      if (!list || !count) {
        console.error("[TaskManager] ERROR: taskList or taskCount element not found!");
        return;
      }
      const filtered = this.getFiltered();
      count.textContent = `${filtered.length} task${filtered.length !== 1 ? "s" : ""}`;
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
      list.innerHTML = filtered.map((t) => {
        const category = t.categoryId ? this.getCategoryById(t.categoryId) : null;
        const blockingTasks = this.getBlockingTasks(t.id);
        const isBlocked = blockingTasks.length > 0;
        return `
                <div class="task-item status-${t.status} priority-${t.priority}" data-id="${this.escapeHtml(t.id)}">
                    <div class="task-header">
                        <span class="task-title ${isBlocked ? "blocked" : ""}">${this.escapeHtml(t.title)}</span>
                        <div class="task-actions">
                            ${isBlocked ? `<span class="block-badge" title="Waiting on: ${blockingTasks.map((b) => b.title).join(", ")}">\u23F3</span>` : ""}
                            <button class="btn-success" onclick="taskManager.toggleStatus('${this.escapeHtml(t.id)}')">${t.status === "completed" /* COMPLETED */ ? "\u21A9\uFE0F" : "\u2713"}</button>
                            <button class="btn-primary" onclick="taskManager.openModalById('${this.escapeHtml(t.id)}')">\u270F\uFE0F</button>
                            <button class="btn-danger" onclick="taskManager.deleteTask('${this.escapeHtml(t.id)}')">\u{1F5D1}\uFE0F</button>
                        </div>
                    </div>
                    ${t.description ? `<p class="task-description">${this.escapeHtml(t.description)}</p>` : ""}
                    <div class="task-meta">
                        <span class="status-badge status-${t.status}">${formatStatus(t.status)}</span>
                        <span>Priority: ${formatPriority(t.priority)}</span>
                        ${category ? `<span class="category-badge" style="background-color: ${category.color}">${this.escapeHtml(category.name)}</span>` : ""}
                        ${t.dueDate ? `<span>\u{1F4C5} ${formatDate(t.dueDate)}${isOverdue(t.dueDate) && t.status !== "completed" /* COMPLETED */ ? " (Overdue)" : ""}</span>` : ""}
                        ${t.recurring?.enabled ? "<span>\u{1F504} Recurring</span>" : ""}
                        ${t.tags.length ? `<span>${t.tags.map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(" ")}</span>` : ""}
                    </div>
                </div>
            `;
      }).join("");
      this.renderStatistics();
    }
    renderStatistics() {
      const statsPanel = document.getElementById("statsPanel");
      if (!statsPanel) return;
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
      const container = document.getElementById("categoryList");
      if (!container) return;
      if (this.categories.length === 0) {
        container.innerHTML = '<p class="empty-text">No categories yet</p>';
        return;
      }
      container.innerHTML = this.categories.map((c) => `
            <div class="category-item" style="border-left-color: ${c.color}">
                <span class="category-name">${this.escapeHtml(c.name)}</span>
                <span class="category-priority">${c.priority ? formatPriority(c.priority) : "Any"}</span>
                <button class="btn-danger btn-sm" onclick="taskManager.deleteCategory('${c.id}')">\u{1F5D1}\uFE0F</button>
            </div>
        `).join("");
      const select = document.getElementById("taskCategory");
      if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">No Category</option>' + this.categories.map((c) => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`).join("");
        select.value = currentValue;
      }
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    msg(text) {
      const el = document.getElementById("successMessage");
      if (el) {
        el.textContent = text;
        el.classList.add("visible");
        setTimeout(() => el.classList.remove("visible"), 3e3);
      }
    }
    err(text) {
      const el = document.getElementById("errorMessage");
      if (el) {
        el.textContent = text;
        el.classList.add("visible");
        setTimeout(() => el.classList.remove("visible"), 5e3);
      }
    }
    showModalError(text) {
      const el = document.getElementById("modalError");
      if (el) {
        el.textContent = text;
        el.classList.add("visible");
      }
    }
    showError(text) {
      const el = document.getElementById("errorMessage");
      if (el) {
        el.textContent = text;
        el.classList.add("visible");
        setTimeout(() => el.classList.remove("visible"), 5e3);
      }
    }
  };
  var taskManager = new TaskManager();
  window.taskManager = taskManager;
  document.addEventListener("DOMContentLoaded", () => taskManager.init());
  return taskManager;
})();
