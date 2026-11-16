import { useColorScheme } from "nativewind";

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return {
    dark,
    background: dark ? "#0D0D0D" : "#F7F0E3",
    surface: dark ? "#171717" : "#FFFFFF",
    text: dark ? "#F7F0E3" : "#0D0D0D",
    muted: dark ? "#B8B0A2" : "#4A4A4A",
    line: dark ? "#2A2622" : "#E6DCC8",
    red: "#CC092F",
    gold: "#FFCB00",
    ocean: "#0E6F7C",
    baobab: "#2E7D4F",
    clay: "#9C3A24",
  };
}
