import { useMemo } from "react";
import { CLIENT_ID, REDIRECT_URL, TENANT_ID } from "../constants";

export default function useIsAuthAvailable(): boolean {
  const isAuthAvailable = useMemo(() => {
    return !!CLIENT_ID && !!TENANT_ID && !!REDIRECT_URL;
  }, []);

  return isAuthAvailable;
}
