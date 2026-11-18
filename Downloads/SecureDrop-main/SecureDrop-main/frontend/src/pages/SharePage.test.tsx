// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getPublicShare } from '../services/shareService';
import { SharePage } from './SharePage';

vi.mock('../services/shareService', () => ({
  downloadShare: vi.fn(),
  getPublicShare: vi.fn(),
  verifySharePassword: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('SharePage', () => {
  it('resolves a human-readable link name from the public route', async () => {
    vi.mocked(getPublicShare).mockResolvedValue({
      success: true,
      data: {
        token: 'internal-token',
        active: true,
        expired: false,
        passwordRequired: false,
        downloadLimit: 5,
        downloadCount: 0,
        expiresAt: null,
        status: 'open',
        fileName: 'report.pdf',
        sizeBytes: 100,
        mimeType: 'application/pdf',
        fileCount: 1,
        files: [],
        message: null,
      },
    });

    render(
      <MemoryRouter initialEntries={['/SecureDrop/team-transfer']}>
        <Routes>
          <Route path="/SecureDrop/:resource" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getPublicShare).toHaveBeenCalledWith('team-transfer');
    });
  });

  it('keeps password-protected links active and explains that a password is required', async () => {
    vi.mocked(getPublicShare).mockResolvedValue({
      success: true,
      data: {
        token: 'internal-token',
        active: true,
        expired: false,
        passwordRequired: true,
        downloadLimit: 5,
        downloadCount: 0,
        expiresAt: null,
        status: 'PASSWORD_REQUIRED',
        fileName: 'report.pdf',
        sizeBytes: 100,
        mimeType: 'application/pdf',
        fileCount: 1,
        files: [],
        message: null,
      },
    });

    render(
      <MemoryRouter initialEntries={['/SecureDrop/team-transfer']}>
        <Routes>
          <Route path="/SecureDrop/:resource" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Password required')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Download file' }).hasAttribute('disabled')).toBe(false);
  });
});
