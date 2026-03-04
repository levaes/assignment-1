// ============================================================================
// GENERIC UTILITY FUNCTIONS
// At least 3 generic utility functions as required
// ============================================================================

import { Result, TaskStatus, TaskPriority } from './types';

/**
 * UTILITY 1: Generic Debounce Function
 * Delays function execution until user stops calling it
 * Useful for search inputs - prevents filtering on every keystroke
 * 
 * @param fn - Function to debounce
 * @param ms - Milliseconds to delay
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number = 300
): (...args: Parameters<T>) => void {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    
    return function(this: unknown, ...args: Parameters<T>) {
        if (timerId) {
            clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
            fn.apply(this, args);
            timerId = null;
        }, ms);
    };
}

/**
 * UTILITY 2: Generic Deep Clone Function
 * Creates a deep copy of an object
 * 
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T;
    }
    
    if (obj instanceof Object) {
        const clonedObj = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    
    return obj;
}

/**
 * UTILITY 3: Generic Filter Function
 * Filters array by multiple criteria
 * 
 * @param items - Array to filter
 * @param predicate - Filter predicate
 * @returns Filtered array
 */
export function filterBy<T>(
    items: T[],
    predicate: (item: T, index: number) => boolean
): T[] {
    return items.filter(predicate);
}

/**
 * UTILITY 4: Generic Sort Function
 * Sorts array by specified field and direction
 * 
 * @param items - Array to sort
 * @param field - Field to sort by
 * @param direction - Sort direction (asc/desc)
 * @returns Sorted array
 */
export function sortBy<T>(
    items: T[],
    field: keyof T,
    direction: 'asc' | 'desc' = 'asc'
): T[] {
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

/**
 * UTILITY 5: Generic Group By Function
 * Groups array items by a key selector
 * 
 * @param items - Array to group
 * @param keySelector - Function to extract group key
 * @returns Grouped object
 */
export function groupBy<T, K extends string | number>(
    items: T[],
    keySelector: (item: T) => K
): Record<K, T[]> {
    return items.reduce((result, item) => {
        const key = keySelector(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {} as Record<K, T[]>);
}

/**
 * UTILITY 6: Generic Unique Function
 * Returns unique items based on a key selector
 * 
 * @param items - Array to get unique items from
 * @param keySelector - Function to extract unique key
 * @returns Array of unique items
 */
export function uniqueBy<T, K>(
    items: T[],
    keySelector: (item: T) => K
): T[] {
    const seen = new Set<K>();
    return items.filter(item => {
        const key = keySelector(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * UTILITY 7: Generic Paginate Function
 * Paginates array by page number and page size
 * 
 * @param items - Array to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated result with metadata
 */
export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number
): {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
} {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
        data: items.slice(startIndex, endIndex),
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

/**
 * UTILITY 8: Generic Retry Function
 * Retries a promise-based function on failure
 * 
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param delay - Delay between attempts in ms
 * @returns Result of the function
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
): Promise<Result<T, Error>> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const data = await fn();
            return { success: true, data };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
    
    return { success: false, error: lastError! };
}

/**
 * UTILITY 9: Generic Cache Function
 * Creates a memoized version of a function
 * 
 * @param fn - Function to cache
 * @returns Cached function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    fn: T
): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)! as ReturnType<T>;
        }
        
        const result = fn(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
}

/**
 * UTILITY 10: Generic Validation Function
 * Validates an object against a schema
 * 
 * @param obj - Object to validate
 * @param schema - Validation schema
 * @returns Validation result with errors
 */
export function validate<T>(
    obj: T,
    schema: Partial<Record<keyof T, (value: unknown) => string | null>>
): Result<T, Partial<Record<keyof T, string>>> {
    const errors = {} as Partial<Record<keyof T, string>>;
    
    const keys = Object.keys(schema) as (keyof T)[];
    for (const field of keys) {
        const validateFn = schema[field];
        if (validateFn) {
            const error = validateFn(obj[field as keyof typeof obj]);
            if (error) {
                errors[field] = error;
            }
        }
    }
    
    const hasErrors = Object.keys(errors).length > 0;
    
    if (hasErrors) {
        return { success: false, error: errors };
    }
    
    return { success: true, data: obj };
}

/**
 * UTILITY 11: Generic Search Function
 * Searches array items by query string across multiple fields
 * 
 * @param items - Array to search
 * @param query - Search query
 * @param fields - Fields to search in
 * @returns Filtered array
 */
export function searchBy<T>(
    items: T[],
    query: string,
    fields: (keyof T)[]
): T[] {
    if (!query.trim()) {
        return items;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    return items.filter(item => {
        return fields.some(field => {
            const value = item[field];
            if (value === null || value === undefined) {
                return false;
            }
            return String(value).toLowerCase().includes(lowerQuery);
        });
    });
}

/**
 * UTILITY 12: Generic Pipeline Function
 * Applies multiple transformations to a value
 * 
 * @param value - Initial value
 * @param fns - Array of transformation functions
 * @returns Final transformed value
 */
export function pipe<T>(value: T, ...fns: ((value: T) => T)[]): T {
    return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * UTILITY 13: Generic Chunk Function
 * Splits array into chunks of specified size
 * 
 * @param items - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/**
 * UTILITY 14: Generic Omit Function
 * Creates object without specified keys
 * 
 * @param obj - Source object
 * @param keys - Keys to omit
 * Returns new object without the specified keys
 */
export function omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
}

/**
 * UTILITY 15: Generic Pick Function
 * Creates object with only specified keys
 * 
 * @param obj - Source object
 * @param keys - Keys to pick
 * Returns new object with only the specified keys
 */
export function pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

/** Format status for display */
export const formatStatus = (status: TaskStatus): string => ({
    [TaskStatus.PENDING]: 'Pending',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.COMPLETED]: 'Completed'
}[status] || status);

/** Format priority for display */
export const formatPriority = (priority: TaskPriority): string => ({
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High'
}[priority] || priority);

/** Format date for display */
export const formatDate = (date: string | null): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// ============================================================================
// ID GENERATOR
// ============================================================================

/** Generate unique ID */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/** Check if date is overdue */
export function isOverdue(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
}

/** Check if date is today */
export function isToday(date: string | null): boolean {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
}

/** Get days until date */
export function getDaysUntil(date: string | null): number | null {
    if (!date) return null;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
