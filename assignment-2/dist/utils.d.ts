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
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms?: number): (...args: Parameters<T>) => void;
/**
 * UTILITY 2: Generic Deep Clone Function
 * Creates a deep copy of an object
 *
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * UTILITY 3: Generic Filter Function
 * Filters array by multiple criteria
 *
 * @param items - Array to filter
 * @param predicate - Filter predicate
 * @returns Filtered array
 */
export declare function filterBy<T>(items: T[], predicate: (item: T, index: number) => boolean): T[];
/**
 * UTILITY 4: Generic Sort Function
 * Sorts array by specified field and direction
 *
 * @param items - Array to sort
 * @param field - Field to sort by
 * @param direction - Sort direction (asc/desc)
 * @returns Sorted array
 */
export declare function sortBy<T>(items: T[], field: keyof T, direction?: 'asc' | 'desc'): T[];
/**
 * UTILITY 5: Generic Group By Function
 * Groups array items by a key selector
 *
 * @param items - Array to group
 * @param keySelector - Function to extract group key
 * @returns Grouped object
 */
export declare function groupBy<T, K extends string | number>(items: T[], keySelector: (item: T) => K): Record<K, T[]>;
/**
 * UTILITY 6: Generic Unique Function
 * Returns unique items based on a key selector
 *
 * @param items - Array to get unique items from
 * @param keySelector - Function to extract unique key
 * @returns Array of unique items
 */
export declare function uniqueBy<T, K>(items: T[], keySelector: (item: T) => K): T[];
/**
 * UTILITY 7: Generic Paginate Function
 * Paginates array by page number and page size
 *
 * @param items - Array to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated result with metadata
 */
export declare function paginate<T>(items: T[], page: number, pageSize: number): {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};
/**
 * UTILITY 8: Generic Retry Function
 * Retries a promise-based function on failure
 *
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param delay - Delay between attempts in ms
 * @returns Result of the function
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number): Promise<Result<T, Error>>;
/**
 * UTILITY 9: Generic Cache Function
 * Creates a memoized version of a function
 *
 * @param fn - Function to cache
 * @returns Cached function
 */
export declare function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T;
/**
 * UTILITY 10: Generic Validation Function
 * Validates an object against a schema
 *
 * @param obj - Object to validate
 * @param schema - Validation schema
 * @returns Validation result with errors
 */
export declare function validate<T>(obj: T, schema: Partial<Record<keyof T, (value: unknown) => string | null>>): Result<T, Partial<Record<keyof T, string>>>;
/**
 * UTILITY 11: Generic Search Function
 * Searches array items by query string across multiple fields
 *
 * @param items - Array to search
 * @param query - Search query
 * @param fields - Fields to search in
 * @returns Filtered array
 */
export declare function searchBy<T>(items: T[], query: string, fields: (keyof T)[]): T[];
/**
 * UTILITY 12: Generic Pipeline Function
 * Applies multiple transformations to a value
 *
 * @param value - Initial value
 * @param fns - Array of transformation functions
 * @returns Final transformed value
 */
export declare function pipe<T>(value: T, ...fns: ((value: T) => T)[]): T;
/**
 * UTILITY 13: Generic Chunk Function
 * Splits array into chunks of specified size
 *
 * @param items - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export declare function chunk<T>(items: T[], size: number): T[][];
/**
 * UTILITY 14: Generic Omit Function
 * Creates object without specified keys
 *
 * @param obj - Source object
 * @param keys - Keys to omit
 * Returns new object without the specified keys
 */
export declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
/**
 * UTILITY 15: Generic Pick Function
 * Creates object with only specified keys
 *
 * @param obj - Source object
 * @param keys - Keys to pick
 * Returns new object with only the specified keys
 */
export declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
/** Format status for display */
export declare const formatStatus: (status: TaskStatus) => string;
/** Format priority for display */
export declare const formatPriority: (priority: TaskPriority) => string;
/** Format date for display */
export declare const formatDate: (date: string | null) => string;
/** Generate unique ID */
export declare function generateId(prefix?: string): string;
/** Check if date is overdue */
export declare function isOverdue(date: string | null): boolean;
/** Check if date is today */
export declare function isToday(date: string | null): boolean;
/** Get days until date */
export declare function getDaysUntil(date: string | null): number | null;
//# sourceMappingURL=utils.d.ts.map