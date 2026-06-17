/**
 * Utility to disable long-press context menus and native browser interactions
 * Makes the PWA feel more like a native app
 */

export const disableLongPressContextMenu = () => {
  // Prevent context menu on right-click and long-press
  const handleContextMenu = (e: Event) => {
    e.preventDefault();
    return false;
  };

  // Prevent text selection that triggers context menu
  const handleSelectStart = (e: Event) => {
    e.preventDefault();
    return false;
  };

  // Prevent long-press on touch devices
  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.style) {
      target.style.userSelect = 'none';
      (target.style as any).webkitUserSelect = 'none';
      (target.style as any).webkitTouchCallout = 'none';
    }
  };

  // Add event listeners
  document.addEventListener('contextmenu', handleContextMenu, { passive: false });
  document.addEventListener('selectstart', handleSelectStart, { passive: false });
  document.addEventListener('touchstart', handleTouchStart as any, { passive: true });

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('selectstart', handleSelectStart);
    document.removeEventListener('touchstart', handleTouchStart as any);
  };
};

/**
 * Disable long-press on specific elements
 */
export const disableLongPressOnElement = (element: HTMLElement) => {
  if (!element || !element.style) return;

  element.style.userSelect = 'none';
  (element.style as any).webkitUserSelect = 'none';
  (element.style as any).webkitTouchCallout = 'none';
  (element.style as any).webkitUserDrag = 'none';

  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
};

/**
 * Enable long-press on specific elements (if needed)
 */
export const enableLongPressOnElement = (element: HTMLElement) => {
  if (!element || !element.style) return;

  element.style.userSelect = 'auto';
  (element.style as any).webkitUserSelect = 'auto';
  (element.style as any).webkitTouchCallout = 'default';
  (element.style as any).webkitUserDrag = 'auto';
};
