// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginUser, registerUser, requestPasswordReset } from '../services/authService';
import { LoginPage } from './LoginPage';

const { resetWidget } = vi.hoisted(() => ({ resetWidget: vi.fn() }));

vi.mock('@marsidev/react-turnstile', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  type MockTurnstileProps = {
    siteKey: string;
    onSuccess?: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
  };

  const Turnstile = React.forwardRef<{ reset: () => void }, MockTurnstileProps>((props, ref) => {
    React.useImperativeHandle(ref, () => ({ reset: resetWidget }));
    return React.createElement(
      'div',
      null,
      React.createElement('button', { type: 'button', onClick: () => props.onSuccess?.('captcha-token') }, 'Complete CAPTCHA'),
      React.createElement('button', { type: 'button', onClick: () => props.onExpire?.() }, 'Expire CAPTCHA'),
      React.createElement('button', { type: 'button', onClick: () => props.onError?.() }, 'Fail CAPTCHA')
    );
  });

  return { Turnstile };
});

vi.mock('../lib/env', () => ({ appEnv: { turnstileSiteKey: 'test-site-key' } }));
vi.mock('../services/authService', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

beforeEach(() => {
  vi.mocked(loginUser).mockResolvedValue({
    success: false,
    error: { code: 'LOGIN_FAILED', message: 'Invalid credentials.' },
  });
  vi.mocked(registerUser).mockResolvedValue({
    success: false,
    error: { code: 'SIGNUP_FAILED', message: 'Unable to register.' },
  });
  vi.mocked(requestPasswordReset).mockResolvedValue({
    success: true,
    data: { message: 'If an account exists for this email, a password reset link will be sent.' },
  });
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage Turnstile verification', () => {
  it('keeps login disabled until verified and clears verification after submit or expiry', async () => {
    renderLoginPage();
    const submit = screen.getByRole('button', { name: 'Sign in securely' });

    expect(submit.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }));
    expect(submit.hasAttribute('disabled')).toBe(false);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'correct-horse',
        captchaToken: 'captcha-token',
      });
    });
    expect(resetWidget).toHaveBeenCalledTimes(1);
    expect(submit.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expire CAPTCHA' }));
    expect(submit.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Security check expired. Please complete it again.')).toBeTruthy();
  });

  it('passes the CAPTCHA token to registration and password reset', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[1]);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'secure-password',
        displayName: 'Ada',
        captchaToken: 'captcha-token',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: 'ada@example.com',
        captchaToken: 'captcha-token',
      });
    });
    expect(screen.getByRole('status').textContent).toContain('password reset link will be sent');
  });
});
