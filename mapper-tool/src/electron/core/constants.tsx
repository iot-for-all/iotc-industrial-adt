// This file contains definitions for app level constants used across all folder types.
// Experience, shell, or other specific constants should be placed elsewhere.
// These constants are used to prevent performing work multiple times and avoiding creating new references.

/**
 * ### Description
 * Use this app level constant to avoid creating new references or to reuse the same reference for some computed 'empty' value
 */
 export const EMPTY_ARRAY = Object.freeze([]) as any[]; // Cast to `any` type for ease of consumption.

 /**
  * ### Description
  * Use this app level constant to avoid creating new references or to reuse the same reference for some computed 'empty' value
  */
 export const EMPTY_OBJECT = Object.freeze({}) as any; // Cast to `any` type for ease of consumption.
 
 /**
  * ### Description
  * A function that takes no parameters, returns void, and performs no action
  */
 export const EMPTY_FUNC = () => {};