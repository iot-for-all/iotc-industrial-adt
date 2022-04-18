import { useBoolean } from "@fluentui/react-hooks";
import { useEffect, useState } from "react";

export default function useIsAuthAvailable(): [boolean, boolean] {
  const [loading, { setFalse }] = useBoolean(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      setAvailable(await window.electron.isAuthAvailable());
    })();
    setFalse();
  }, []);

  return [loading, available];
}
