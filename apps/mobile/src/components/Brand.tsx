import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { BRAND } from "@nzila/shared";
import { cn } from "@/lib/utils";

export function NzilaMark({
  size = 40,
  color = BRAND.red,
  dotColor = BRAND.gold,
}: {
  size?: number;
  color?: string;
  dotColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M8 31V9l24 22V9"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="32" cy="31" r="3.6" fill={dotColor} />
    </Svg>
  );
}

export function Wordmark({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <NzilaMark size={30} color={dark ? BRAND.gold : BRAND.red} />
      <View className="flex-row items-baseline">
        <Text
          className={cn(
            "font-heading text-xl tracking-tight",
            dark ? "text-nzila-sand" : "text-ink",
          )}
        >
          nzila
        </Text>
        <Text
          className={cn(
            "ml-1 font-body-semi text-[10px] uppercase tracking-[2px]",
            dark ? "text-nzila-gold" : "text-nzila-red",
          )}
        >
          concierge
        </Text>
      </View>
    </View>
  );
}
