import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import type { MeResponse } from "@nzila/shared";
import { queryKeys, queryClient } from "@/lib/query";
import { useSession } from "@/store/session";

export function NotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { rideId?: string };
      if (!data.rideId) return;
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ride(data.rideId) });

      if (!useSession.getState().session) return;
      const me = queryClient.getQueryData<MeResponse>(queryKeys.me);
      const path =
        me?.profile.role === "driver"
          ? `/(driver)/ride/${data.rideId}`
          : `/(client)/ride/${data.rideId}`;
      router.push(path as never);
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [router]);

  return null;
}
