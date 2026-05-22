import { useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

interface LiveHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartStream: (roomName: string, token: string) => void;
}

export default function LiveHostModal({
  isOpen,
  onClose,
  onStartStream,
}: LiveHostModalProps) {
  const { displayName } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartStream = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the API to generate a token
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: displayName,
          roomName: roomName.trim(),
          isHost: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate token');
      }

      const { token } = await response.json();
      onStartStream(roomName.trim(), token);
      setRoomName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error starting stream:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Start Live Stream</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Name
            </label>
            <Input
              type="text"
              placeholder="e.g., Astronomy Basics"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800 border-white/10 text-white placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Give your live stream a descriptive name
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              You will be able to share this room with others to watch your live stream.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartStream}
              disabled={isLoading || !roomName.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                'Start Stream'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
