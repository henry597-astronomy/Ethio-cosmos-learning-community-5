export default function BottomTaskBar() {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-white/10 h-12 flex items-center justify-center px-4"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3rem',
        zIndex: 40,
        // Ensure it stays above content but below modals
        // Safe area support for notched devices
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Task bar content will be added here */}
    </div>
  );
}
