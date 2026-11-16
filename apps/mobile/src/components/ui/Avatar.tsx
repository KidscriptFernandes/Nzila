import { Text, View } from "react-native";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({
  name,
  size = 48,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-full bg-nzila-black dark:bg-nzila-sand",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Text
        className="font-heading-semi text-nzila-sand dark:text-nzila-black"
        style={{ fontSize: size * 0.36 }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
