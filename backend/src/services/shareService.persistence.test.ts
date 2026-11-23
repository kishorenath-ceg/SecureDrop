import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistence = vi.hoisted(() => {
  const rows: Array<Record<string, unknown>> = [];

  return {
    rows,
    client: {
      from() {
        const filters: Record<string, unknown> = {};
        let inserted: Record<string, unknown> | undefined;
        const query = {
          insert(values: Record<string, unknown>) {
            inserted = values;
            return query;
          },
          select() {
            return query;
          },
          eq(column: string, value: unknown) {
            filters[column] = value;
            return query;
          },
          async single() {
            const row = { ...inserted, id: 'persisted-share' };
            rows.push(row);
            return { data: row, error: null };
          },
          async maybeSingle() {
            const row = rows.find((candidate) =>
              Object.entries(filters).every(([key, value]) => candidate[key] === value)
            );
            return { data: row ?? null, error: null };
          },
        };
        return query;
      },
    },
  };
});

vi.mock('../config/supabase.js', () => ({ supabaseAdmin: persistence.client }));
vi.mock('./supabaseService.js', () => ({ isSupabaseConfigured: () => true }));

import {
  createShareRecord,
  getShareRecordByIdentifier,
  shareLinkStore,
  shareSlugIndex,
} from './shareService.js';

describe('persistent share records', () => {
  beforeEach(() => {
    persistence.rows.length = 0;
    shareLinkStore.clear();
    shareSlugIndex.clear();
  });

  it('resolves a link from persistent storage after the process-local cache is empty', async () => {
    const saved = await createShareRecord({
      ownerId: 'owner-1',
      fileIds: ['file-1', 'file-2'],
      customSlug: 'persistent-transfer',
    });

    shareLinkStore.clear();
    shareSlugIndex.clear();

    await expect(getShareRecordByIdentifier('persistent-transfer')).resolves.toMatchObject({
      token: saved.token,
      fileIds: ['file-1', 'file-2'],
    });
  });
});
