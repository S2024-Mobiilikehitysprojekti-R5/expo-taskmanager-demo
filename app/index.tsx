import { Button, View } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage, {
  useAsyncStorage,
} from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const LOCATION_TASK_NAME = "background-location-task";
const TRACKING_ENABLED_KEY = "@tracking-enabled";
const INACTIVITY_NOTIFICATION_ID_KEY = "@inactivity-notification-id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Launches the background location task with specified settings.
const launchLocationTask = async () => {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    timeInterval: 2000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "expo-taskmanager-demo",
      notificationBody: "Background location is running...",
      killServiceOnDestroy: false,
    },
  }).catch(console.error);
};

// Defines the background location task to handle location updates.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      const { locations } = data;

      // Store the latest location timestamp in AsyncStorage.
      await AsyncStorage.setItem(
        "@previous-location-timestamp",
        locations[0].timestamp.toString()
      );
      console.log(locations);

      // Get the notification ID from AsyncStorage
      const notificationId = await AsyncStorage.getItem(
        INACTIVITY_NOTIFICATION_ID_KEY
      );

      // Cancel any existing scheduled inactivity notification
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }

      // Schedule a new notification to be sent in 20 seconds
      const newNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Inactivity Alert",
          body: "You have not moved in a while...",
        },
        trigger: {
          seconds: 20,
          repeats: true,
        },
      });

      // Store the new notification ID
      await AsyncStorage.setItem(
        INACTIVITY_NOTIFICATION_ID_KEY,
        newNotificationId
      );
    }
  }
);

export default function Index() {
  const [isTracking, setIsTracking] = useState(false);
  const { getItem, setItem } = useAsyncStorage(TRACKING_ENABLED_KEY);

  useEffect(() => {
    (async () => {
      // On component mount, check if tracking is enabled.
      // This ensures that the tracking state is preserved across app restarts.
      const trackingEnabled = (await getItem()) === "true";
      setIsTracking(trackingEnabled);
    })();
  }, [getItem]);

  useEffect(() => {
    (async () => {
      if (isTracking) {
        const hasStarted =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!hasStarted) {
          await launchLocationTask();
        }
      }
    })();
  }, [isTracking]);

  // Toggles the location tracking state.
  const toggleLocationTracking = useCallback(async () => {
    const isTaskActive =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

    if (isTracking && isTaskActive) {
      console.log("Stopping location updates...");
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(false);
      setItem("false");
    } else {
      console.log("Starting location updates...");
      setIsTracking(true);
      setItem("true");
      await launchLocationTask();
    }
  }, [isTracking, setIsTracking, setItem]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button
        onPress={toggleLocationTracking}
        title={isTracking ? "Stop Tracking" : "Start Tracking"}
        color={isTracking ? "red" : "green"}
      />
    </View>
  );
}
