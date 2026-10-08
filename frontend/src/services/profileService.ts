import { apiFetch } from '../lib/api';

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export async function getCurrentProfile() {
  return apiFetch<Profile>('/api/v1/profile', {
    method: 'GET',
  });
}

export async function updateCurrentProfile(payload: { display_name: string }) {
  return apiFetch<Profile>('/api/v1/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
