
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface SolarSystemViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SolarSystemViewer({ isOpen, onClose }: SolarSystemViewerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Header with Close Button */}
      <div className="absolute top-4 right-4 z-[101]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/20 backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* The container that locks the simulator to full screen */}
      <div className="solar-system-wrapper flex-1 relative">
        <style dangerouslySetInnerHTML={{ __html: `
          /* The container that locks the simulator to full screen */
          .solar-system-wrapper {
              width: 100%;
              height: 100%;
              background-color: #000;
          }

          /* Forces the NASA iframe to fill its wrapper entirely */
          .solar-system-wrapper iframe {
              width: 100%;
              height: 100%;
              border: none;
          }

          /* THE MAGIC TRICK: If a phone/tablet is held vertically (Portrait Mode) */
          @media screen and (orientation: portrait) {
              .solar-system-wrapper {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vh;  /* Swap width to match the screen's height */
                  height: 100vw; /* Swap height to match the screen's width */
                  transform: rotate(90deg); /* Spin the whole app 90 degrees */
                  transform-origin: top left; /* Rotate around the top-left corner */
                  top: 0;
                  left: 100vw; /* Shift it back perfectly into the phone frame */
                  z-index: 9999;
              }
          }
        `}} />
        <iframe 
          src="https://eyes.nasa.gov/apps/solar-system/" 
          allow="fullscreen; autoplay"
          loading="lazy"
          title="3D Solar System"
        />
      </div>
    </div>
  );
}
