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

/**
 * ### Description
 * Authentication messages
 */
export const AUTH_MESSAGES = {
  SHOW_WELCOME_MESSAGE: "SHOW_WELCOME_MESSAGE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  GET_PROFILE: "GET_PROFILE",
  SET_PROFILE: "SET_PROFILE",
  GET_MAIL: "GET_MAIL",
  SET_MAIL: "SET_MAIL",
};

export const CACHE_LOCATION = "./data/cache.json";

export const REDIRECT_URL = "msal3e9a455b-b362-4872-a159-7b769ad497fe";

export const TOKEN_AUDIENCES = {
  Arm: "https://management.azure.com/user_impersonation",
  ADT: "https://digitaltwins.azure.net/Read.Write",
};

export const API_VERSIONS = {
  DigitalTwinsControl: "2020-12-01",
  DigitalTwinsData: "2020-10-31",
  ResourceManager: "2021-04-01",
};
