/**
 * Utility to disable long-press context menus and native browser interactions
 * Makes the PWA feel more like a native app
 */

export const disableLongPressContextMenu = () => {
  // Prevent context menu on right-click and long-press
  const handleContextMenu = (e: MouseEvent | TouchEvent) => {
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
    if (target) {
      target.style.userSelect = 'none';
      target.style.WebkitUserSelect = 'none';
      target.style.WebkitTouchCallout = 'none';
    }
  };

  // Add event listeners
  document.addEventListener('contextmenu', handleContextMenu as EventListener, { passive: false });
  document.addEventListener('selectstart', handleSelectStart, { passive: false });
  document.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });

  // Also prevent on all elements
  document.addEventListener('touchhold', (e) => {
    e.preventDefault();
    return false;
  });

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu as EventListener);
    document.removeEventListener('selectstart', handleSelectStart);
    document.removeEventListener('touchstart', handleTouchStart as EventListener);
  };
};

/**
 * Disable long-press on specific elements
 */
export const disableLongPressOnElement = (element: HTMLElement) => {
  if (!element) return;

  element.style.userSelect = 'none';
  element.style.WebkitUserSelect = 'none';
  element.style.WebkitTouchCallout = 'none';
  element.style.WebkitUserDrag = 'none';

  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  element.addEventListener('touchstart', (e) => {
    e.preventDefault();
  });
};

/**
 * Enable long-press on specific elements (if needed)
 */
export const enableLongPressOnElement = (element: HTMLElement) => {
  if (!element) return;

  element.style.userSelect = 'auto';
  element.style.WebkitUserSelect = 'auto';
  element.style.WebkitTouchCallout = 'default';
  element.style.WebkitUserDrag = 'auto';
};
