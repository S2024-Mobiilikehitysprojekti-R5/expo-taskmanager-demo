import { Button, View } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage, {
  useAsyncStorage,
} from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";

const LOCATION_TASK_NAME = "background-location-task";
const NOTIFICATION_TASK_NAME = "notify-if-inactive";
const TRACKING_ENABLED_KEY = "@tracking-enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const launchLocationTask = async () => {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    timeInterval: 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "expo-taskmanager-demo",
      notificationBody: "Background location is running...",
      killServiceOnDestroy: false,
    },
  }).catch(console.error);
};

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      const { locations } = data;

      AsyncStorage.setItem(
        "@previous-location-timestamp",
        locations[0].timestamp.toString()
      );
      console.log(locations);
    }
  }
);

TaskManager.defineTask(NOTIFICATION_TASK_NAME, async () => {
  const previousTimestamp = await AsyncStorage.getItem(
    "@previous-location-timestamp"
  ).catch(console.error);

  if (!previousTimestamp) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const previousLocationTime = parseInt(previousTimestamp);
  const timeSinceLastLocation = Date.now() - previousLocationTime;

  if (timeSinceLastLocation > 20000) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Inactivity Alert",
        body: "You have not moved in a while...",
      },
      trigger: null,
    });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  }

  return BackgroundFetch.BackgroundFetchResult.NoData;
});

BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK_NAME, {
  minimumInterval: 20,
  stopOnTerminate: false,
  startOnBoot: true,
})
  .then(() => {
    console.log("BackgroundFetch task registered");
  })
  .catch(console.error);

export default function Index() {
  const [isTracking, setIsTracking] = useState(false);
  const { getItem, setItem } = useAsyncStorage(TRACKING_ENABLED_KEY);

  useEffect(() => {
    (async () => {
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
