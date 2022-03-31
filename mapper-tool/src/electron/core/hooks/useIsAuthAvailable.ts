export default function useIsAuthAvailable(): boolean {
  return window.electron.isAuthAvailable();
}
