/**
 * Utility to disable long-press context menus and native browser interactions
 * Makes the PWA feel more like a native app without breaking scrolling
 */

export const disableLongPressContextMenu = () => {
  // Prevent context menu on right-click and long-press
  const handleContextMenu = (e: Event) => {
    // Check if the target is an input or textarea, we might want to allow context menu there
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return true;
    }
    
    e.preventDefault();
    return false;
  };

  // Prevent text selection that triggers context menu on long press
  const handleSelectStart = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return true;
    }
    e.preventDefault();
    return false;
  };

  // Prevent long-press callout on touch devices
  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.style) {
      // Only apply to non-input elements
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        (target.style as any).webkitTouchCallout = 'none';
        (target.style as any).webkitUserSelect = 'none';
      }
    }
  };

  // Add event listeners
  // Note: We DO NOT preventDefault on touchstart or touchmove to ensure scrolling works
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

  (element.style as any).webkitTouchCallout = 'none';
  (element.style as any).webkitUserSelect = 'none';
  (element.style as any).webkitUserDrag = 'none';

  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
};
