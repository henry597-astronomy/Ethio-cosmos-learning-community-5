/**
 * Stream Utilities
 * Helper functions for LiveKit streaming with participant metadata
 */

export interface ParticipantMetadata {
  avatar_url?: string;
  username?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Encode participant metadata to JSON string
 * Used when publishing participant info to the stream
 */
export function encodeParticipantMetadata(metadata: ParticipantMetadata): string {
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.error('Error encoding participant metadata:', error);
    return '{}';
  }
}

/**
 * Decode participant metadata from JSON string
 * Used when reading participant info from the stream
 */
export function decodeParticipantMetadata(metadataString: string): ParticipantMetadata {
  try {
    if (!metadataString) return {};
    return JSON.parse(metadataString);
  } catch (error) {
    console.error('Error decoding participant metadata:', error);
    return {};
  }
}

/**
 * Get participant avatar URL with fallback
 */
export function getParticipantAvatarUrl(
  metadata: ParticipantMetadata | string,
  fallbackColor?: string
): string | null {
  const parsedMetadata = typeof metadata === 'string' 
    ? decodeParticipantMetadata(metadata)
    : metadata;

  return parsedMetadata.avatar_url || null;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a color based on a string (deterministic)
 * Useful for avatar backgrounds when no image is available
 */
export function getColorFromString(str: string): string {
  const colors = [
    'from-red-500 to-orange-500',
    'from-orange-500 to-yellow-500',
    'from-yellow-500 to-green-500',
    'from-green-500 to-blue-500',
    'from-blue-500 to-indigo-500',
    'from-indigo-500 to-purple-500',
    'from-purple-500 to-pink-500',
    'from-pink-500 to-red-500',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format participant count
 */
export function formatParticipantCount(count: number): string {
  if (count === 0) return 'No participants';
  if (count === 1) return '1 participant';
  return `${count} participants`;
}

/**
 * Validate if a participant can be promoted to co-host
 */
export function canPromoteToCoHost(
  participantIdentity: string,
  hostIdentity: string,
  currentCoHostIdentity: string | null
): boolean {
  return (
    participantIdentity !== hostIdentity &&
    participantIdentity !== currentCoHostIdentity
  );
}
