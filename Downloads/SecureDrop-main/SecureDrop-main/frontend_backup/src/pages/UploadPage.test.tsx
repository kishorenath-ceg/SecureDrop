// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShareLink } from '../services/shareService';
import { uploadFile } from '../services/fileService';
import { UploadPage } from './UploadPage';

vi.mock('../services/fileService', () => ({ uploadFile: vi.fn() }));
vi.mock('../services/shareService', () => ({ createShareLink: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('UploadPage multi-file transfer', () => {
  it('uploads every selected file and creates one link and QR for the whole transfer', async () => {
    const firstFile = new File(['first'], 'first.txt', { type: 'text/plain' });
    const secondFile = new File(['second'], 'second.txt', { type: 'text/plain' });

    vi.mocked(uploadFile)
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'file-1',
          originalName: firstFile.name,
          storagePath: 'file-1',
          mimeType: 'text/plain',
          sizeBytes: firstFile.size,
          createdAt: '2025-01-01T00:00:00.000Z',
          status: 'ready',
          uploadUrl: '',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'file-2',
          originalName: secondFile.name,
          storagePath: 'file-2',
          mimeType: 'text/plain',
          sizeBytes: secondFile.size,
          createdAt: '2025-01-01T00:00:00.000Z',
          status: 'ready',
          uploadUrl: '',
        },
      });

    vi.mocked(createShareLink).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'link-1',
        token: 'token-1',
        fileId: 'file-1',
        fileIds: ['file-1', 'file-2'],
        fileCount: 2,
        totalSizeBytes: firstFile.size + secondFile.size,
        shareUrl: 'https://securedrop.example/share/token-1',
        customSlug: null,
        expiresAt: null,
        maxDownloads: 10,
        passwordProtected: false,
        message: null,
      },
    });

    render(<UploadPage />);
    fireEvent.change(screen.getByLabelText('Choose multiple files'), {
      target: { files: [firstFile, secondFile] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload 2 files' }));

    await waitFor(() => {
      expect(screen.getAllByText('Ready')).toHaveLength(2);
    });
    expect(uploadFile).toHaveBeenNthCalledWith(1, firstFile, expect.any(Function));
    expect(uploadFile).toHaveBeenNthCalledWith(2, secondFile, expect.any(Function));

    fireEvent.click(screen.getByRole('tab', { name: '2. Create one link' }));
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'team-transfer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create one secure link' }));

    await waitFor(() => {
      expect(screen.getByText('https://securedrop.example/share/token-1')).toBeTruthy();
    });
    expect(createShareLink).toHaveBeenCalledTimes(1);
    expect(createShareLink).toHaveBeenCalledWith(
      expect.objectContaining({ fileIds: ['file-1', 'file-2'], customSlug: 'team-transfer' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    expect(screen.getByTitle('QR code for the complete transfer')).toBeTruthy();
  });

  it('continues after one upload fails and allows retrying only failed files', async () => {
    const firstFile = new File(['first'], 'first.txt', { type: 'text/plain' });
    const secondFile = new File(['second'], 'second.txt', { type: 'text/plain' });
    const successfulUpload = {
      success: true as const,
      data: {
        id: 'file-success',
        originalName: secondFile.name,
        storagePath: 'file-success',
        mimeType: 'text/plain',
        sizeBytes: secondFile.size,
        createdAt: '2025-01-01T00:00:00.000Z',
        status: 'ready',
        uploadUrl: '',
      },
    };

    vi.mocked(uploadFile)
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'SIZE_LIMIT', message: 'File is too large.' },
      })
      .mockResolvedValueOnce(successfulUpload)
      .mockResolvedValueOnce({
        ...successfulUpload,
        data: { ...successfulUpload.data, id: 'file-retried', originalName: firstFile.name },
      });

    render(<UploadPage />);
    fireEvent.change(screen.getByLabelText('Choose multiple files'), {
      target: { files: [firstFile, secondFile] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload 2 files' }));

    await waitFor(() => {
      expect(screen.getByText(/Uploaded 1 file; 1 failed/)).toBeTruthy();
      expect(screen.getByText('File is too large.')).toBeTruthy();
      expect(screen.getAllByText('Ready')).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload 1 file' }));
    await waitFor(() => {
      expect(screen.getAllByText('Ready')).toHaveLength(2);
    });
    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(uploadFile).toHaveBeenNthCalledWith(3, firstFile, expect.any(Function));
  });
});
