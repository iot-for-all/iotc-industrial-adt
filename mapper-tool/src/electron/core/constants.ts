// import "dotenv/config";
// This file contains definitions for app level constants used across all folder types.
// Experience, shell, or other specific constants should be placed elsewhere.
// These constants are used to prevent performing work multiple times and avoiding creating new references.

/**
 * ### Description
 * Use this app level constant to avoid creating new references or to reuse the same reference for some computed 'empty' value
 */
export const EMPTY_ARRAY = Object.freeze([]) as unknown[]; // Cast to `unknown` type for ease of consumption.

/**
 * ### Description
 * Use this app level constant to avoid creating new references or to reuse the same reference for some computed 'empty' value
 */
export const EMPTY_OBJECT = Object.freeze({}) as unknown; // Cast to `unknown` type for ease of consumption.

/**
 * ### Description
 * A function that takes no parameters, returns void, and performs no action
 */
export const EMPTY_FUNC = () => {
  // do nothing
};

/**
 * AUTHENTICATION PARAMETERS
 * replace with valid values
 */
// export const CLIENT_ID = "3e9a455b-b362-4872-a159-7b769ad497fe";
// export const TENANT_ID = "4ac2d501-d648-4bd0-8486-653a65f90fc7";
// export const REDIRECT_URL = "msal3e9a455b-b362-4872-a159-7b769ad497fe";
export const CLIENT_ID = process.env.CLIENT_ID || ""; // AAD Application Id
export const TENANT_ID = process.env.TENANT_ID || ""; // Azure Tenant Id or Name
export const REDIRECT_URL = process.env.REDIRECT_URL || ""; // AAD Application redirect (MSAL)

export const CACHE_LOCATION = "./data/cache.json";

export const TOKEN_AUDIENCES = {
  Arm: "https://management.azure.com/user_impersonation",
  ADT: "https://digitaltwins.azure.net/Read.Write",
};

export const API_VERSIONS = {
  DigitalTwinsControl: "2020-12-01",
  DigitalTwinsData: "2020-10-31",
  ResourceManager: "2021-04-01",
};
