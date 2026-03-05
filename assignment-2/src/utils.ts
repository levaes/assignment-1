// ============================================================================
// UTILITIES - Reusable helper functions for common operations
// These functions solve everyday programming problems
// ============================================================================

import { Result, TaskStatus, TaskPriority } from './types';

// ============================================================================
// DEBOUNCE - Delays function execution until user stops calling it
// Use case: Search input - don't filter on every keystroke, wait until user stops typing
// ============================================================================

/**
 * Debounce - Waits for the user to stop calling a function before executing it
 * @param fn - The function to debounce
 * @param ms - Milliseconds to wait (default 300ms = 0.3 seconds)
 * @returns A new function that only runs after the delay
 * 
 * Example: debounce(() => save(), 500) 
 * - User types "hello" quickly
 * - Function only runs once, 500ms after user stops typing
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number = 300
): (...args: Parameters<T>) => void {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    
    return function(this: unknown, ...args: Parameters<T>) {
        if (timerId) clearTimeout(timerId);  // Cancel previous timer
        timerId = setTimeout(() => {
            fn.apply(this, args);
            timerId = null;
        }, ms);
    };
}

// ============================================================================
// DEEP CLONE - Creates a complete copy of an object (not just reference)
// Use case: When you need to modify an object without affecting the original
// ============================================================================

/**
 * Deep Clone - Creates a complete copy of any object
 * Why "deep"? Because it copies nested objects too, not just the top level
 * @param obj - Object to copy
 * @returns A completely new object with same values
 * 
 * Example: const copy = deepClone(original)
 * - Modifying copy.original won't affect original
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;  // Primitives don't need cloning
    
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
    
    // For objects, recursively clone each property
    const clonedObj = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}

// ============================================================================
// FILTER BY - Filter array with custom predicate
// ============================================================================

/**
 * Filter array items by a custom condition
 * @param items - Array to filter
 * @param predicate - Function that returns true for items to keep
 * @returns Filtered array
 */
export function filterBy<T>(items: T[], predicate: (item: T, index: number) => boolean): T[] {
    return items.filter(predicate);
}

// ============================================================================
// SORT BY - Sort array by a specific field
// ============================================================================

/**
 * Sort array by a specific property
 * @param items - Array to sort
 * @param field - Property name to sort by
 * @param direction - 'asc' (A-Z) or 'desc' (Z-A)
 * @returns New sorted array (doesn't modify original)
 */
export function sortBy<T>(items: T[], field: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
    const sorted = [...items].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

// ============================================================================
// GROUP BY - Group array items by a key
// ============================================================================

/**
 * Group items by a specific property (e.g., group tasks by priority)
 * @param items - Array to group
 * @param keySelector - Function that returns the grouping key
 * @returns Object with keys as group names and arrays as values
 */
export function groupBy<T, K extends string | number>(items: T[], keySelector: (item: T) => K): Record<K, T[]> {
    return items.reduce((result, item) => {
        const key = keySelector(item);
        if (!result[key]) result[key] = [];
        result[key].push(item);
        return result;
    }, {} as Record<K, T[]>);
}

// ============================================================================
// UNIQUE BY - Get unique items based on a key
// ============================================================================

/**
 * Remove duplicate items from array based on a property
 * @param items - Array to process
 * @param keySelector - Function that returns the unique key
 * @returns Array with duplicates removed
 */
export function uniqueBy<T, K>(items: T[], keySelector: (item: T) => K): T[] {
    const seen = new Set<K>();
    return items.filter(item => {
        const key = keySelector(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ============================================================================
// PAGINATE - Split array into pages
// ============================================================================

/**
 * Split array into pages for pagination UI
 * @param items - Array to paginate
 * @param page - Page number (1 = first page)
 * @param pageSize - Number of items per page
 * @returns Object with page data and metadata
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    
    return {
        data: items.slice(startIndex, startIndex + pageSize),
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

// ============================================================================
// RETRY - Retry a failing operation
// ============================================================================

/**
 * Retry an async operation if it fails (useful for network requests)
 * @param fn - Async function to try
 * @param maxAttempts - How many times to try (default 3)
 * @param delay - MS to wait between attempts (default 1000ms)
 * @returns Result with data or error
 */
export async function retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<Result<T, Error>> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const data = await fn();
            return { success: true, data };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delay * attempt));
        }
    }
    
    return { success: false, error: lastError! };
}

// ============================================================================
// MEMOIZE - Cache function results
// ============================================================================

/**
 * Memoization - Cache function results so expensive operations don't repeat
 * @param fn - Function to cache
 * @returns Cached version of the function
 * 
 * Example: const cachedGet = memoize(expensiveApiCall)
 * - First call: runs the function, stores result
 * - Second call with same args: returns cached result instantly
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key)!;
        
        const result = fn(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
}

// ============================================================================
// VALIDATE - Check object against validation rules
// ============================================================================

/**
 * Validate an object against a schema of rules
 * @param obj - Object to validate
 * @param schema - Object with validation functions for each field
 * @returns Result with errors if validation fails
 */
export function validate<T>(obj: T, schema: Partial<Record<keyof T, (value: unknown) => string | null>>): Result<T, Partial<Record<keyof T, string>>> {
    const errors = {} as Partial<Record<keyof T, string>>;
    
    for (const field of Object.keys(schema) as (keyof T)[]) {
        const validateFn = schema[field];
        if (validateFn) {
            const error = validateFn(obj[field as keyof typeof obj]);
            if (error) errors[field] = error;
        }
    }
    
    return Object.keys(errors).length > 0 
        ? { success: false, error: errors }
        : { success: true, data: obj };
}

// ============================================================================
// SEARCH BY - Search across multiple fields
// ============================================================================

/**
 * Search array by query string across multiple fields
 * @param items - Array to search
 * @param query - Search term
 * @param fields - Fields to search in
 * @returns Filtered array
 */
export function searchBy<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
    if (!query.trim()) return items;
    
    const lowerQuery = query.toLowerCase().trim();
    
    return items.filter(item =>
        fields.some(field => {
            const value = item[field];
            return value != null && String(value).toLowerCase().includes(lowerQuery);
        })
    );
}

// ============================================================================
// PIPE - Chain transformations
// ============================================================================

/**
 * Pipe - Apply multiple functions to a value in sequence
 * @param value - Starting value
 * @param fns - Functions to apply in order
 * @returns Final transformed value
 * 
 * Example: pipe(5, x => x * 2, x => x + 1) returns 11
 */
export function pipe<T>(value: T, ...fns: ((value: T) => T)[]): T {
    return fns.reduce((acc, fn) => fn(acc), value);
}

// ============================================================================
// CHUNK - Split array into chunks
// ============================================================================

/**
 * Split array into smaller arrays of specified size
 * @param items - Array to split
 * @param size - Size of each chunk
 * @returns Array of arrays
 */
export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

// ============================================================================
// OMIT - Remove properties from object
// ============================================================================

/**
 * Create a new object without specified properties
 * @param obj - Source object
 * @param keys - Properties to remove
 * @returns New object without those properties
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
}

// ============================================================================
// PICK - Keep only specified properties
// ============================================================================

/**
 * Create a new object with only specified properties
 * @param obj - Source object
 * @param keys - Properties to keep
 * @returns New object with only those properties
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => { if (key in obj) result[key] = obj[key]; });
    return result;
}

// ============================================================================
// FORMAT HELPERS - Convert values to display strings
// ============================================================================

/** Convert TaskStatus enum to display string */
export const formatStatus = (status: TaskStatus): string => ({
    [TaskStatus.PENDING]: 'Pending',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.COMPLETED]: 'Completed'
}[status] || status);

/** Convert TaskPriority enum to display string */
export const formatPriority = (priority: TaskPriority): string => ({
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High'
}[priority] || priority);

/** Convert ISO date string to human-readable format */
export const formatDate = (date: string | null): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ============================================================================
// ID GENERATOR - Create unique identifiers
// ============================================================================

/**
 * Generate a unique ID with optional prefix
 * @param prefix - Prefix for the ID (default: 'id')
 * @returns Unique string like "task_1234567890_abc123def"
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================================
// DATE HELPERS - Common date checks
// ============================================================================

/** Check if a date is in the past */
export function isOverdue(date: string | null): boolean {
    return !!(date && new Date(date) < new Date());
}

/** Check if date is today */
export function isToday(date: string | null): boolean {
    if (!date) return false;
    return new Date(date).toDateString() === new Date().toDateString();
}

/** Calculate days until a date (negative if past) */
export function getDaysUntil(date: string | null): number | null {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}
