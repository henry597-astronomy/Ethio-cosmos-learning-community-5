/**
 * Utility to disable long-press context menus
 * Minimal implementation to avoid interfering with scrolling
 */

export const disableLongPressContextMenu = () => {
  // Prevent context menu globally
  const handleContextMenu = (e: Event) => {
    const target = e.target as HTMLElement;
    // Allow context menu on inputs and textareas
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return true;
    }
    
    e.preventDefault();
    return false;
  };

  // Add event listener
  // We ONLY listen to contextmenu. This is the most reliable way to block the menu
  // without interfering with any touch or scroll gestures.
  document.addEventListener('contextmenu', handleContextMenu, { capture: true });

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
  };
};
