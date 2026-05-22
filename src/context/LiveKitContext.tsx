import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface LiveKitContextType {
  isLiveModalOpen: boolean;
  isHosting: boolean;
  liveRoomName: string | null;
  liveToken: string | null;
  openLiveModal: () => void;
  closeLiveModal: () => void;
  startHosting: (roomName: string, token: string) => void;
  stopHosting: () => void;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [liveRoomName, setLiveRoomName] = useState<string | null>(null);
  const [liveToken, setLiveToken] = useState<string | null>(null);

  const openLiveModal = useCallback(() => {
    setIsLiveModalOpen(true);
  }, []);

  const closeLiveModal = useCallback(() => {
    setIsLiveModalOpen(false);
  }, []);

  const startHosting = useCallback((roomName: string, token: string) => {
    setLiveRoomName(roomName);
    setLiveToken(token);
    setIsHosting(true);
    setIsLiveModalOpen(false);
  }, []);

  const stopHosting = useCallback(() => {
    setLiveRoomName(null);
    setLiveToken(null);
    setIsHosting(false);
  }, []);

  return (
    <LiveKitContext.Provider
      value={{
        isLiveModalOpen,
        isHosting,
        liveRoomName,
        liveToken,
        openLiveModal,
        closeLiveModal,
        startHosting,
        stopHosting,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  );
}

export function useLiveKit() {
  const ctx = useContext(LiveKitContext);
  if (ctx === undefined)
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  return ctx;
}
