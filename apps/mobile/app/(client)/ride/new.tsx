import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Info,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  Trash2,
} from "lucide-react-native";
import type { ClientRidePriority, CreateRidePayload } from "@nzila/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { PriorityChip } from "@/components/ui/PriorityChip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useMe } from "@/features/auth/hooks";
import { useCreateRide } from "@/features/rides/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { luandaDateTimeToIso, wallDateParts } from "@/lib/format";
import { useRideDraft } from "@/store/ride-draft";
import { cn } from "@/lib/utils";

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default function NewRideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    destination?: string;
    destinationLat?: string;
    destinationLng?: string;
  }>();
  const me = useMe();
  const createRide = useCreateRide();
  const initialized = useRef(false);

  const originPin = useRideDraft((state) => state.originPin);
  const destinationPin = useRideDraft((state) => state.destinationPin);
  const setOriginPin = useRideDraft((state) => state.setOriginPin);
  const setDestinationPin = useRideDraft((state) => state.setDestinationPin);
  const clearPins = useRideDraft((state) => state.clearPins);

  const [customerName, setCustomerName] = useState(me.data?.profile.fullName ?? "");
  const [phone, setPhone] = useState(me.data?.profile.whatsapp || "+244");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState(asString(params.destination) ?? "");
  const [scheduled, setScheduled] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    return date;
  });
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [priority, setPriority] = useState<ClientRidePriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const lat = Number(asString(params.destinationLat));
    const lng = Number(asString(params.destinationLng));
    setOriginPin(null);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestinationPin({ lat, lng, label: asString(params.destination) });
    } else {
      setDestinationPin(null);
    }
  }, [params.destination, params.destinationLat, params.destinationLng, setDestinationPin, setOriginPin]);

  useEffect(() => {
    if (originPin?.label) setOrigin(originPin.label);
  }, [originPin?.label]);

  useEffect(() => {
    if (destinationPin?.label) setDestination(destinationPin.label);
  }, [destinationPin?.label]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (customerName.trim().length < 2) next.customerName = t("rideForm.errName");
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) next.phone = t("rideForm.errPhone");
    if (origin.trim().length < 3) next.origin = t("rideForm.errOrigin");
    if (destination.trim().length < 3) next.destination = t("rideForm.errDestination");
    const parts = wallDateParts(scheduled);
    const iso = luandaDateTimeToIso(parts.date, parts.time);
    if (new Date(iso).getTime() <= Date.now() + 30 * 60_000) {
      next.schedule = t("rideForm.errSchedule");
    }
    if (notes.trim().length > 500) next.notes = t("rideForm.errNotes");
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;

    const parts = wallDateParts(scheduled);
    const payload: CreateRidePayload = {
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      scheduledAt: new Date(luandaDateTimeToIso(parts.date, parts.time)),
      passengers,
      luggage,
      priority,
      ...(originPin ? { originLat: originPin.lat, originLng: originPin.lng } : {}),
      ...(destinationPin
        ? { destinationLat: destinationPin.lat, destinationLng: destinationPin.lng }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    createRide.mutate(payload, {
      onSuccess: (ride) => {
        clearPins();
        router.replace(`/(client)/ride/${ride.id}`);
      },
      onError: (error) => {
        notify(t("rideForm.submitError"), apiErrorMessage(error, t));
      },
    });
  };

  return (
    <Screen scroll keyboard contentContainerClassName="pb-10">
      <ScreenHeader back title={t("rideForm.title")} subtitle={t("rideForm.subtitle")} />

      <View className="px-5">
      <Card className="mt-3 gap-4">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("rideDetail.trip")}
        </Text>
        <Input
          label={t("auth.fullName")}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder={t("auth.fullName")}
          error={fieldErrors.customerName}
          autoCapitalize="words"
        />
        <Input
          label={t("auth.whatsapp")}
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^\d+]/g, ""))}
          placeholder="+244923000000"
          keyboardType="phone-pad"
          error={fieldErrors.phone}
        />
        <View className="gap-2">
          <Input
            label={t("rideForm.origin")}
            value={origin}
            onChangeText={setOrigin}
            placeholder={t("rideForm.originPlaceholder")}
            error={fieldErrors.origin}
            left={<MapPin size={17} color="#0E6F7C" />}
          />
          <View className="flex-row items-center justify-between gap-2">
            <Pressable
              onPress={() => router.push("/(client)/ride/pick-location?kind=origin")}
              className="flex-row items-center gap-1.5 py-1"
            >
              <MapPinned size={14} color="#CC092F" />
              <Text className="font-body-semi text-xs text-nzila-red">
                {originPin ? t("rideForm.pinned") : t("rideForm.pinOrigin")}
              </Text>
            </Pressable>
            {originPin ? (
              <Pressable
                onPress={() => setOriginPin(null)}
                className="flex-row items-center gap-1 py-1"
              >
                <Trash2 size={13} color="#8A8A8A" />
                <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                  {t("rideForm.clearPin")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="gap-2">
          <Input
            label={t("rideForm.destination")}
            value={destination}
            onChangeText={setDestination}
            placeholder={t("rideForm.destinationPlaceholder")}
            error={fieldErrors.destination}
            left={<MapPin size={17} color="#CC092F" />}
          />
          <View className="flex-row items-center justify-between gap-2">
            <Pressable
              onPress={() => router.push("/(client)/ride/pick-location?kind=destination")}
              className="flex-row items-center gap-1.5 py-1"
            >
              <MapPinned size={14} color="#CC092F" />
              <Text className="font-body-semi text-xs text-nzila-red">
                {destinationPin ? t("rideForm.pinned") : t("rideForm.pinDestination")}
              </Text>
            </Pressable>
            {destinationPin ? (
              <Pressable
                onPress={() => setDestinationPin(null)}
                className="flex-row items-center gap-1 py-1"
              >
                <Trash2 size={13} color="#8A8A8A" />
                <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                  {t("rideForm.clearPin")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="font-body-semi text-[13px] text-ink dark:text-nzila-sand">
            {t("rideForm.schedule")}
          </Text>
          <View className="flex-row gap-3">
            <DatePickerField
              label={t("rideForm.date")}
              value={scheduled}
              mode="date"
              minimumDate={new Date()}
              onChange={setScheduled}
              hint={t("rideForm.dateHint")}
            />
            <DatePickerField
              label={t("rideForm.time")}
              value={scheduled}
              mode="time"
              onChange={setScheduled}
            />
          </View>
          {fieldErrors.schedule ? (
            <Text className="font-body text-xs text-nzila-red">{fieldErrors.schedule}</Text>
          ) : null}
        </View>
      </Card>

      <Card className="mt-4 gap-4">
        <Counter
          label={t("rideForm.passengers")}
          value={passengers}
          min={1}
          max={8}
          onChange={setPassengers}
        />
        <View className="h-px bg-line dark:bg-night-line" />
        <Counter
          label={t("rideForm.luggage")}
          value={luggage}
          min={0}
          max={10}
          onChange={setLuggage}
        />
      </Card>

      <Card className="mt-4 gap-3">
        <Text className="font-body-semi text-[13px] text-ink dark:text-nzila-sand">
          {t("rideForm.priority")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <PriorityChip
            priority="NORMAL"
            selected={priority === "NORMAL"}
            onPress={() => setPriority("NORMAL")}
          />
          <PriorityChip
            priority="PRIORIDADE"
            selected={priority === "PRIORIDADE"}
            onPress={() => setPriority("PRIORIDADE")}
          />
        </View>
      </Card>

      <Card className="mt-4 gap-2">
        <Input
          label={t("rideForm.notes")}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("rideForm.notesPlaceholder")}
          multiline
          error={fieldErrors.notes}
          maxLength={500}
        />
      </Card>

      <Card variant="ocean" className="mt-4 flex-row items-start gap-2">
        <Info size={17} color="#0E6F7C" style={{ marginTop: 1 }} />
        <View className="flex-1">
          <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
            {t("rideForm.priceLater")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("rideForm.disclaimer")}
          </Text>
        </View>
      </Card>

      <Button
        label={createRide.isPending ? t("rideForm.submitting") : t("rideForm.submit")}
        size="lg"
        fullWidth
        className="mt-5"
        loading={createRide.isPending}
        onPress={submit}
      />
      </View>
    </Screen>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={cn(
            "h-9 w-9 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal",
            value <= min && "opacity-40",
          )}
        >
          <Minus size={16} color="#4A4A4A" />
        </Pressable>
        <Text className="w-6 text-center font-heading-semi text-base text-ink dark:text-nzila-sand">
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={cn(
            "h-9 w-9 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal",
            value >= max && "opacity-40",
          )}
        >
          <Plus size={16} color="#4A4A4A" />
        </Pressable>
      </View>
    </View>
  );
}
