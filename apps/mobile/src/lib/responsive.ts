import { useWindowDimensions } from "react-native";

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isCompact: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.desktop,
  };
}
