export function generateId(): string {
  // consistent with the one in logging library
  return Math.floor(Math.random() * 1e16).toString(36);
}
