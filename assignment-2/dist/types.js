// ============================================================================
// TYPE DEFINITIONS
// Custom type definitions for all entities
// ============================================================================
// ============================================================================
// ENUM TYPES
// ============================================================================
/** Task status enum */
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in-progress";
    TaskStatus["COMPLETED"] = "completed";
})(TaskStatus || (TaskStatus = {}));
/** Task priority enum */
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["HIGH"] = "high";
})(TaskPriority || (TaskPriority = {}));
/** Recurring frequency enum */
export var RecurringFrequency;
(function (RecurringFrequency) {
    RecurringFrequency["DAILY"] = "daily";
    RecurringFrequency["WEEKLY"] = "weekly";
    RecurringFrequency["BIWEEKLY"] = "biweekly";
    RecurringFrequency["MONTHLY"] = "monthly";
    RecurringFrequency["YEARLY"] = "yearly";
})(RecurringFrequency || (RecurringFrequency = {}));
/** Sort field enum */
export var SortField;
(function (SortField) {
    SortField["TITLE"] = "title";
    SortField["PRIORITY"] = "priority";
    SortField["STATUS"] = "status";
    SortField["DUE_DATE"] = "dueDate";
    SortField["CREATED_AT"] = "createdAt";
    SortField["UPDATED_AT"] = "updatedAt";
})(SortField || (SortField = {}));
/** Sort direction enum */
export var SortDirection;
(function (SortDirection) {
    SortDirection["ASC"] = "asc";
    SortDirection["DESC"] = "desc";
})(SortDirection || (SortDirection = {}));
// ============================================================================
// TYPE GUARDS
// ============================================================================
/** Type guard for TaskStatus */
export function isTaskStatus(value) {
    return Object.values(TaskStatus).includes(value);
}
/** Type guard for TaskPriority */
export function isTaskPriority(value) {
    return Object.values(TaskPriority).includes(value);
}
/** Type guard for RecurringFrequency */
export function isRecurringFrequency(value) {
    return Object.values(RecurringFrequency).includes(value);
}
/** Type guard for Task */
export function isTask(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'title' in value &&
        'status' in value);
}
/** Type guard for Category */
export function isCategory(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'name' in value &&
        'color' in value);
}
//# sourceMappingURL=types.js.map