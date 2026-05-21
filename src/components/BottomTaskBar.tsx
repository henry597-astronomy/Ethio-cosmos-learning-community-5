import { useState } from 'react';
import { Globe } from 'lucide-react';
import SolarSystemViewer from './SolarSystemViewer';

export default function BottomTaskBar() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[40] bg-slate-950/90 backdrop-blur-md border-t border-white/10 h-12 flex items-center justify-center px-4">
        <button
          onClick={() => setIsViewerOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Globe className="w-4 h-4" />
          <span>3D Solar System</span>
        </button>
      </div>

      <SolarSystemViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
      />
    </>
  );
}
