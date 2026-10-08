import { describe, expect, it } from 'vitest';
import { isProfileOwner, normalizeProfileUpdate } from './profileService.js';

describe('profile service', () => {
  it('allows a valid profile display name update', () => {
    expect(normalizeProfileUpdate({ display_name: 'Jane Doe' })).toMatchObject({
      success: true,
      data: { display_name: 'Jane Doe' },
    });
  });

  it('rejects unsafe profile fields such as user_id', () => {
    const result = normalizeProfileUpdate({ display_name: 'Jane Doe', user_id: 'other-user' });
    expect(result.success).toBe(false);
  });

  it('enforces ownership using the authenticated user id', () => {
    expect(isProfileOwner('user-a', 'user-a')).toBe(true);
    expect(isProfileOwner('user-a', 'user-b')).toBe(false);
  });
});
