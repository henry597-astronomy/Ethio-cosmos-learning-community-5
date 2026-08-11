import { describe, it, expect } from 'vitest';
import { getGravatarUrl } from './gravatar';

describe('getGravatarUrl', () => {
  // Known MD5 test vectors
  it('returns the correct Gravatar URL for a known email', () => {
    // MD5("user@example.com") = b58996c504c5638798eb6b511e6f49af
    expect(getGravatarUrl('user@example.com')).toBe(
      'https://www.gravatar.com/avatar/b58996c504c5638798eb6b511e6f49af?d=retro&s=160'
    );
  });

  it('normalizes email case and whitespace', () => {
    const upper = getGravatarUrl('  User@Example.COM ');
    const lower = getGravatarUrl('user@example.com');
    expect(upper).toBe(lower);
  });

  it('returns null for missing or invalid input', () => {
    expect(getGravatarUrl('')).toBeNull();
    expect(getGravatarUrl(null)).toBeNull();
    expect(getGravatarUrl(undefined)).toBeNull();
    expect(getGravatarUrl('not-an-email')).toBeNull();
  });

  it('supports a custom size', () => {
    const url = getGravatarUrl('user@example.com', 80);
    expect(url).toContain('s=80');
  });
});
