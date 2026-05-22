import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface StreamParticipant {
  identity: string;
  name: string;
  avatar_url?: string;
  isCoHost: boolean;
}

interface StreamParticipantContextType {
  coHostIdentity: string | null;
  setCoHostIdentity: (identity: string | null) => void;
  participants: StreamParticipant[];
  setParticipants: (participants: StreamParticipant[]) => void;
  promoteToCoHost: (identity: string) => void;
  demoteFromCoHost: () => void;
}

const StreamParticipantContext = createContext<StreamParticipantContextType | undefined>(
  undefined
);

export function StreamParticipantProvider({ children }: { children: ReactNode }) {
  const [coHostIdentity, setCoHostIdentity] = useState<string | null>(null);
  const [participants, setParticipants] = useState<StreamParticipant[]>([]);

  const promoteToCoHost = useCallback((identity: string) => {
    setCoHostIdentity(identity);
  }, []);

  const demoteFromCoHost = useCallback(() => {
    setCoHostIdentity(null);
  }, []);

  return (
    <StreamParticipantContext.Provider
      value={{
        coHostIdentity,
        setCoHostIdentity,
        participants,
        setParticipants,
        promoteToCoHost,
        demoteFromCoHost,
      }}
    >
      {children}
    </StreamParticipantContext.Provider>
  );
}

export function useStreamParticipants() {
  const ctx = useContext(StreamParticipantContext);
  if (ctx === undefined) {
    throw new Error('useStreamParticipants must be used within StreamParticipantProvider');
  }
  return ctx;
}
