import { useRef, useState } from "react";
import { FlatList, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { HeartHandshake, Route, ShieldCheck } from "lucide-react-native";
import { NzilaMark, Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import type { AppLocale } from "@/lib/format";
import { markOnboardingSeen } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { useSettings } from "@/store/settings";

const SLIDES = [
  {
    key: "one",
    title: "onboarding.slide1Title",
    body: "onboarding.slide1Body",
    icon: ShieldCheck,
  },
  {
    key: "two",
    title: "onboarding.slide2Title",
    body: "onboarding.slide2Body",
    icon: Route,
  },
  {
    key: "three",
    title: "onboarding.slide3Title",
    body: "onboarding.slide3Body",
    icon: HeartHandshake,
  },
] as const;

const LANGUAGES: Array<{ value: AppLocale; label: string }> = [
  { value: "pt-AO", label: "PT" },
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);

  const go = async (path: "/(auth)/register" | "/(auth)/login") => {
    await markOnboardingSeen();
    router.push(path);
  };

  return (
    <Screen edges={["top", "bottom"]} className="overflow-hidden">
      <View className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-nzila-gold-soft dark:bg-nzila-gold/10" />
      <View className="pointer-events-none absolute -left-16 bottom-40 h-44 w-44 rotate-12 rounded-3xl bg-nzila-red-soft dark:bg-nzila-red/10" />

      <View className="flex-row items-center justify-between px-5 pt-3">
        <Wordmark />
        <View className="flex-row gap-1 rounded-full border border-line bg-surface p-1 dark:border-night-line dark:bg-coal">
          {LANGUAGES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setLanguage(item.value)}
              className={cn("rounded-full px-2.5 py-1", language === item.value && "bg-nzila-red")}
            >
              <Text
                className={cn(
                  "font-body-semi text-[11px]",
                  language === item.value ? "text-white" : "text-ink-soft dark:text-night-muted",
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(event) => {
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item, index: slideIndex }) => {
          const Icon = item.icon;
          return (
            <View className="flex-1 px-6 pt-8" style={{ width }}>
              <View className="mb-8 h-56 items-center justify-center rounded-3xl border border-line bg-surface dark:border-night-line dark:bg-coal">
                <View className="h-28 w-28 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
                  <Icon size={44} color="#CC092F" strokeWidth={1.6} />
                </View>
                <View className="absolute bottom-5 right-5 h-10 w-10 items-center justify-center rounded-full bg-nzila-gold">
                  <Text className="font-heading text-sm text-nzila-black">0{slideIndex + 1}</Text>
                </View>
              </View>

              <Text className="font-heading text-[32px] leading-[38px] tracking-tight text-ink dark:text-nzila-sand">
                {t(item.title)}
              </Text>
              <Text className="mt-3 font-body text-base leading-6 text-ink-soft dark:text-night-muted">
                {t(item.body)}
              </Text>
            </View>
          );
        }}
      />

      <View className="px-6 pb-4 pt-2">
        <View className="mb-5 flex-row items-center gap-2">
          {SLIDES.map((slide, dotIndex) => (
            <Pressable
              key={slide.key}
              onPress={() =>
                listRef.current?.scrollToOffset({ offset: dotIndex * width, animated: true })
              }
              className={cn(
                "h-1.5 rounded-full",
                dotIndex === index ? "w-7 bg-nzila-red" : "w-2 bg-line dark:bg-night-line",
              )}
            />
          ))}
        </View>

        <Button
          label={t("onboarding.ctaStart")}
          size="lg"
          fullWidth
          onPress={() => void go("/(auth)/register")}
        />
        <Button
          label={t("onboarding.ctaLogin")}
          variant="ghost"
          size="sm"
          fullWidth
          className="mt-2"
          onPress={() => void go("/(auth)/login")}
        />

        <View className="mt-4 flex-row items-center justify-center gap-2">
          <NzilaMark size={16} />
          <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
            {t("onboarding.trust")}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
