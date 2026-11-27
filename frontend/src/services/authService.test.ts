import { afterEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: authMock },
}));

import { loginUser, registerUser, requestPasswordReset } from './authService';

afterEach(() => {
  vi.resetAllMocks();
});

describe('authService CAPTCHA tokens', () => {
  it('passes registration tokens to Supabase Auth', async () => {
    authMock.signUp.mockRejectedValueOnce(new Error('test response'));

    await expect(
      registerUser({
        email: 'user@example.com',
        password: 'secure-password',
        displayName: 'User',
        captchaToken: 'signup-token',
      })
    ).rejects.toThrow('test response');

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secure-password',
      options: {
        data: { display_name: 'User' },
        captchaToken: 'signup-token',
      },
    });
  });

  it('passes login tokens to Supabase Auth', async () => {
    authMock.signInWithPassword.mockRejectedValueOnce(new Error('test response'));

    await expect(
      loginUser({
        email: 'user@example.com',
        password: 'secure-password',
        captchaToken: 'login-token',
      })
    ).rejects.toThrow('test response');

    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secure-password',
      options: { captchaToken: 'login-token' },
    });
  });

  it('passes password-reset tokens to Supabase Auth', async () => {
    authMock.resetPasswordForEmail.mockRejectedValueOnce(new Error('test response'));

    await expect(
      requestPasswordReset({
        email: 'user@example.com',
        captchaToken: 'reset-token',
      })
    ).rejects.toThrow('test response');

    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      captchaToken: 'reset-token',
    });
  });
});
