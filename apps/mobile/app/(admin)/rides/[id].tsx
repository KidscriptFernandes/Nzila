import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatKz } from "@nzila/shared";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  isTerminalStatus,
  type PaymentMethod,
  type PaymentStatus,
  type RideDTO,
} from "@nzila/shared";
import {
  AlertTriangle,
  CarFront,
  CreditCard,
  MapPin,
  Phone,
  Route,
  UserRound,
  Wallet,
} from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useAdminAnalyseRide,
  useAdminAssignDriver,
  useAdminCommunicatePolicy,
  useAdminDrivers,
  useAdminRecordPayment,
  useAdminRideTransition,
  useAdminSetRidePrice,
  useAdminUpdateRideRoute,
} from "@/features/admin/hooks";
import { useRide, useRideRealtime } from "@/features/rides/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default function AdminRideDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = asString(params.id);
  const rideQuery = useRide(id);
  useRideRealtime(id);

  if (rideQuery.isPending) return <LoadingScreen />;
  if (rideQuery.isError || !rideQuery.data) {
    return (
      <Screen>
        <ScreenHeader back title={t("adminRides.detailTitle")} />
        <ErrorState
          message={apiErrorMessage(rideQuery.error, t)}
          onRetry={() => void rideQuery.refetch()}
        />
      </Screen>
    );
  }

  return <RideBody ride={rideQuery.data} />;
}

function RideBody({ ride }: { ride: RideDTO }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const analyse = useAdminAnalyseRide(ride.id);
  const transition = useAdminRideTransition(ride.id);
  const terminal = isTerminalStatus(ride.status);

  const runTransition = (action: "start" | "complete" | "cancel") => {
    if (action === "cancel") {
      confirmAction({
        title: t("adminRides.cancel"),
        message: t("adminRides.cancelConfirm"),
        confirmLabel: t("adminRides.cancel"),
        cancelLabel: t("common.back"),
        destructive: true,
        onConfirm: () =>
          transition.mutate(
            { action },
            {
              onSuccess: () => notify(t("adminRides.updated")),
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            },
          ),
      });
      return;
    }
    transition.mutate(
      { action },
      {
        onSuccess: () => notify(t("adminRides.updated")),
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Screen
      scroll
      contentContainerClassName="w-full max-w-4xl self-center px-5 pb-12"
    >
      <ScreenHeader back title={t("adminRides.detailTitle")} />

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-semi text-xs uppercase tracking-[1px] text-ink-soft dark:text-night-muted">
            {ride.reference}
          </Text>
          <StatusBadge status={ride.status} />
        </View>
        <Text className="font-heading text-2xl tracking-tight text-ink dark:text-nzila-sand">
          {formatDateTime(ride.scheduledAt, i18n.language)}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Badge tone="neutral" label={t("units.passengers", { count: ride.passengers })} />
          <Badge tone="neutral" label={t("units.luggage", { count: ride.luggage })} />
          <Badge tone="gold" label={t(`priority.${ride.priority}`)} />
          <Badge tone="ocean" label={formatKz(ride.priceKz)} />
        </View>
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center gap-2">
          <UserRound size={16} color={colors.ocean} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("adminRides.customer")}
          </Text>
        </View>
        <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
          {ride.customerName}
        </Text>
        {ride.customerPhone ? (
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {ride.customerPhone}
          </Text>
        ) : null}
        {ride.customerPhone ? (
          <Button
            label={t("common.call")}
            variant="outline"
            size="sm"
            leftIcon={<Phone size={14} color={colors.text} />}
            onPress={() => void Linking.openURL(`tel:${ride.customerPhone}`)}
          />
        ) : null}
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center gap-2">
          <MapPin size={16} color={colors.red} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("adminRides.route")}
          </Text>
        </View>
        <Text className="font-body text-[11px] uppercase tracking-wide text-ink-soft dark:text-night-muted">
          {t("rideDetail.from")}
        </Text>
        <Text className="font-body text-sm text-ink dark:text-nzila-sand">{ride.origin}</Text>
        <Text className="font-body text-[11px] uppercase tracking-wide text-ink-soft dark:text-night-muted">
          {t("rideDetail.to")}
        </Text>
        <Text className="font-body text-sm text-ink dark:text-nzila-sand">{ride.destination}</Text>
        {ride.notes ? (
          <View className="rounded-2xl bg-canvas p-3 dark:bg-night">
            <Text className="font-body-semi text-[11px] text-ink-soft dark:text-night-muted">
              {t("rideDetail.notes")}
            </Text>
            <Text className="mt-1 font-body text-xs leading-5 text-ink dark:text-nzila-sand">
              {ride.notes}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("adminRides.operations")}
          </Text>
          <Badge tone="ocean" label={t("adminPanel.operations")} />
        </View>

        {ride.status === "NOVO" ? (
          <Button
            label={t("adminRides.analyse")}
            fullWidth
            loading={analyse.isPending}
            onPress={() =>
              analyse.mutate(undefined, {
                onSuccess: () => notify(t("adminRides.updated")),
                onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
              })
            }
          />
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {ride.status === "CLIENTE_CONFIRMADO" ? (
            <Button
              label={t("adminRides.start")}
              size="sm"
              loading={transition.isPending}
              onPress={() => runTransition("start")}
            />
          ) : null}
          {ride.status === "EM_VIAGEM" || ride.status === "PROBLEMA" ? (
            <Button
              label={t("adminRides.complete")}
              size="sm"
              loading={transition.isPending}
              onPress={() => runTransition("complete")}
            />
          ) : null}
          {!terminal ? (
            <Button
              label={t("adminRides.cancel")}
              variant="outline"
              size="sm"
              className="border-nzila-red"
              textClassName="text-nzila-red"
              loading={transition.isPending}
              onPress={() => runTransition("cancel")}
            />
          ) : null}
          <Button
            label={t("adminRides.openDriverArea")}
            variant="ghost"
            size="sm"
            onPress={() => router.push("/(admin)/(tabs)/drivers")}
          />
        </View>

        {["EM_ANALISE", "MOTORISTA_PROCURADO", "SEM_MOTORISTA"].includes(ride.status) ? (
          <AssignDriverBox ride={ride} />
        ) : null}
      </Card>

      {ride.driver ? (
        <Card className="mt-4 gap-3">
          <View className="flex-row items-center gap-2">
            <CarFront size={16} color={colors.baobab} />
            <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
              {t("rideDetail.driver")}
            </Text>
          </View>
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {ride.driver.fullName} · {ride.driver.code}
          </Text>
          {ride.driver.vehicle ? (
            <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
              {ride.driver.vehicle.make} {ride.driver.vehicle.model} ·{" "}
              {ride.driver.vehicle.plate}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {!terminal ? <PriceBox ride={ride} /> : null}
      <PaymentBox ride={ride} />
      {!terminal ? <RouteBox ride={ride} /> : null}

      {ride.cancelReason ? (
        <Card variant="red" className="mt-4 flex-row items-start gap-2">
          <AlertTriangle size={17} color={colors.red} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
              {t("adminRides.cancelReason")}
            </Text>
            <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {ride.cancelReason}
            </Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function AssignDriverBox({ ride }: { ride: RideDTO }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const drivers = useAdminDrivers({ verification: "VERIFICADO", limit: 200 });
  const assign = useAdminAssignDriver(ride.id);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const selectedDriver = drivers.data?.items.find((item) => item.id === driverId);

  const chooseDriver = (id: string) => {
    setDriverId(id);
    const driver = drivers.data?.items.find((item) => item.id === id);
    setVehicleId(driver?.vehicles.find((vehicle) => vehicle.active)?.id ?? null);
  };

  return (
    <View className="gap-3 border-t border-line pt-3 dark:border-night-line">
      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
        {t("adminRides.assignTitle")}
      </Text>
      <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
        {t("adminRides.assignHint")}
      </Text>

      {drivers.isPending ? (
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("common.loading")}
        </Text>
      ) : drivers.isError ? (
        <Text className="font-body text-xs text-nzila-red">
          {apiErrorMessage(drivers.error, t)}
        </Text>
      ) : drivers.data?.items.length ? (
        <View className="gap-2">
          {drivers.data.items.map((driver) => (
            <Button
              key={driver.id}
              label={`${driver.fullName} · ${driver.code}`}
              variant={driverId === driver.id ? "secondary" : "outline"}
              size="sm"
              fullWidth
              onPress={() => chooseDriver(driver.id)}
            />
          ))}
        </View>
      ) : (
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("adminRides.noVerifiedDrivers")}
        </Text>
      )}

      {selectedDriver ? (
        <View className="gap-2">
          <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
            {t("adminRides.vehicle")}
          </Text>
          {selectedDriver.vehicles.filter((vehicle) => vehicle.active).length ? (
            selectedDriver.vehicles
              .filter((vehicle) => vehicle.active)
              .map((vehicle) => (
                <Button
                  key={vehicle.id}
                  label={`${vehicle.make} ${vehicle.model} · ${vehicle.plate} · ${vehicle.seats} ${t("rideForm.passengers").toLowerCase()}`}
                  variant={vehicleId === vehicle.id ? "secondary" : "outline"}
                  size="sm"
                  fullWidth
                  onPress={() => setVehicleId(vehicle.id)}
                />
              ))
          ) : (
            <Text className="font-body text-xs text-nzila-red">
              {t("adminRides.noActiveVehicle")}
            </Text>
          )}
        </View>
      ) : null}

      <Button
        label={assign.isPending ? t("adminRides.assigning") : t("adminRides.assign")}
        fullWidth
        loading={assign.isPending}
        disabled={!driverId || !vehicleId}
        onPress={() =>
          assign.mutate(
            { driverId: driverId!, vehicleId: vehicleId! },
            {
              onSuccess: () => {
                notify(t("adminRides.assigned"));
                setDriverId(null);
                setVehicleId(null);
              },
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            },
          )
        }
      />
      <Text className="font-body text-[11px] leading-4 text-ink-soft dark:text-night-muted">
        {t("adminRides.assignPendingNote")}
      </Text>
    </View>
  );
}

function PriceBox({ ride }: { ride: RideDTO }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const priceMutation = useAdminSetRidePrice(ride.id);
  const communicate = useAdminCommunicatePolicy(ride.id);
  const [price, setPrice] = useState(ride.priceKz == null ? "" : String(ride.priceKz));
  const [policy, setPolicy] = useState(ride.cancellationPolicy ?? "");

  const applyPrice = () => {
    const value = Number(price);
    if (!Number.isInteger(value) || value <= 0) {
      notify(t("common.error"), t("adminRides.invalidPrice"));
      return;
    }
    priceMutation.mutate(
      {
        priceKz: value,
        ...(policy.trim().length >= 10 ? { cancellationPolicy: policy.trim() } : {}),
      },
      {
        onSuccess: () => notify(t("adminRides.priceSaved")),
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Card className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Wallet size={16} color={colors.gold} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("adminRides.pricing")}
          </Text>
        </View>
        {ride.cancellationPolicyCommunicatedAt ? (
          <Badge tone="green" label={t("adminRides.policyConfirmed")} />
        ) : null}
      </View>

      <Input
        label={t("adminRides.priceKz")}
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        placeholder="25000"
      />
      <Input
        label={t("adminRides.policy")}
        value={policy}
        onChangeText={setPolicy}
        placeholder={t("adminRides.policyPlaceholder")}
        multiline
        maxLength={1000}
      />
      <View className="flex-row flex-wrap gap-2">
        <Button
          label={priceMutation.isPending ? t("adminRides.saving") : t("adminRides.savePrice")}
          size="sm"
          loading={priceMutation.isPending}
          onPress={applyPrice}
        />
        <Button
          label={communicate.isPending ? t("adminRides.sending") : t("adminRides.communicatePolicy")}
          variant="outline"
          size="sm"
          loading={communicate.isPending}
          disabled={policy.trim().length < 10}
          onPress={() =>
            communicate.mutate(policy.trim(), {
              onSuccess: () => notify(t("adminRides.policySent")),
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            })
          }
        />
      </View>
    </Card>
  );
}

function PaymentBox({ ride }: { ride: RideDTO }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const payment = useAdminRecordPayment(ride.id);
  const [status, setStatus] = useState<PaymentStatus>(ride.paymentStatus);
  const [method, setMethod] = useState<PaymentMethod | null>(ride.paymentMethod);

  return (
    <Card className="mt-4 gap-3">
      <View className="flex-row items-center gap-2">
        <CreditCard size={16} color={colors.ocean} />
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("adminRides.payment")}
        </Text>
      </View>

      <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
        {t("adminRides.paymentStatus")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {PAYMENT_STATUSES.map((value) => (
          <Chip
            key={value}
            label={t(`paymentStatus.${value}`)}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
        {t("adminRides.paymentMethod")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {PAYMENT_METHODS.map((value) => (
          <Chip
            key={value}
            label={t(`payment.${value}`)}
            selected={method === value}
            onPress={() => setMethod(value)}
          />
        ))}
      </View>

      <Button
        label={payment.isPending ? t("adminRides.saving") : t("adminRides.savePayment")}
        fullWidth
        size="sm"
        loading={payment.isPending}
        onPress={() =>
          payment.mutate(
            {
              paymentStatus: status,
              ...(method ? { paymentMethod: method } : {}),
            },
            {
              onSuccess: () => notify(t("adminRides.paymentSaved")),
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            },
          )
        }
      />
    </Card>
  );
}

function RouteBox({ ride }: { ride: RideDTO }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const update = useAdminUpdateRideRoute(ride.id);
  const [origin, setOrigin] = useState(ride.origin);
  const [destination, setDestination] = useState(ride.destination);

  return (
    <Card className="mt-4 gap-3">
      <View className="flex-row items-center gap-2">
        <Route size={16} color={colors.red} />
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("adminRides.editRoute")}
        </Text>
      </View>
      <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
        {t("adminRides.editRouteHint")}
      </Text>
      <Input label={t("rideDetail.from")} value={origin} onChangeText={setOrigin} />
      <Input label={t("rideDetail.to")} value={destination} onChangeText={setDestination} />
      <Button
        label={update.isPending ? t("adminRides.saving") : t("adminRides.saveRoute")}
        size="sm"
        loading={update.isPending}
        onPress={() =>
          update.mutate(
            { origin: origin.trim(), destination: destination.trim() },
            {
              onSuccess: () => notify(t("adminRides.routeSaved")),
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            },
          )
        }
      />
    </Card>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      label={label}
      size="sm"
      variant={selected ? "secondary" : "outline"}
      onPress={onPress}
    />
  );
}
