import { Image, Text, View } from "react-native";
import { cn } from "@/lib/utils";

export function NzilaMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/images/logo.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

export function Wordmark({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <NzilaMark size={30} />
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
