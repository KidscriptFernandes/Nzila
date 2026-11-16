import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={cn("rounded-xl bg-line dark:bg-night-line", className)}
    />
  );
}
