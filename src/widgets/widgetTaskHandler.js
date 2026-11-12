/** Headless task: Android asks us to draw / refresh a widget. */
import { loadWidgetData } from './widgetData';
import { renderStashlyWidget } from './StashlyWidgets';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }
  let data = null;
  try {
    data = await loadWidgetData();
  } catch {
    data = null;
  }
  renderWidget(renderStashlyWidget(widgetInfo.widgetName, data, widgetInfo));
}
