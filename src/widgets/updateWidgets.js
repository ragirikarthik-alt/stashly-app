/** Push fresh numbers to any widgets placed on the home screen. */
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WIDGET_NAMES, renderStashlyWidget } from './StashlyWidgets';
import { buildWidgetData } from './widgetData';

let timer = null;

/** Debounced so a burst of edits causes one redraw. */
export function scheduleWidgetUpdate(snapshot) {
  if (Platform.OS !== 'android') {
    return;
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    const data = buildWidgetData(snapshot);
    for (const widgetName of WIDGET_NAMES) {
      requestWidgetUpdate({
        widgetName,
        renderWidget: info => renderStashlyWidget(widgetName, data, info),
        widgetNotFound: () => {},
      }).catch(() => {});
    }
  }, 400);
}
