import { Stack } from "expo-router";
import { useEffect } from "react";
import * as Location from "expo-location";
import * as Notification from "expo-notifications";

const requestPermissions = async () => {
  const { status: foregroundStatus } =
    await Location.getForegroundPermissionsAsync();
  if (foregroundStatus !== "granted") {
    await Location.requestForegroundPermissionsAsync();
  }

  const { status: backgroundStatus } =
    await Location.getBackgroundPermissionsAsync();
  if (backgroundStatus !== "granted") {
    await Location.requestBackgroundPermissionsAsync();
  }

  const { status: notificationStatus } =
    await Notification.getPermissionsAsync();
  if (notificationStatus !== "granted") {
    await Notification.requestPermissionsAsync();
  }
};

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      await requestPermissions();
    })();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" />
    </Stack>
  );
}
