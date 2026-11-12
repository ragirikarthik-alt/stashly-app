/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee, { EventType } from 'react-native-notify-kit';
import App from './src/App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';
import { setPendingAction } from './src/navigation/pendingAction';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Home-screen widgets render from a headless JS task.
registerWidgetTaskHandler(widgetTaskHandler);

// A reminder tapped while the app is in the background: remember what to do,
// App.js performs it as soon as the app is in the foreground.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail?.notification?.data?.action) {
    setPendingAction(detail.notification.data.action);
  }
});
