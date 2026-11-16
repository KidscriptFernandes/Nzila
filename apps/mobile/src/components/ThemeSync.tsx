import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import { useSettings } from "@/store/settings";

export function ThemeSync() {
  const theme = useSettings((state) => state.theme);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  return null;
}
