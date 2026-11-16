import { z } from 'zod';

export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().min(2).max(80),
  })
  .strict()
  .refine((value) => !('user_id' in value || 'id' in value), {
    message: 'Only safe profile fields may be updated.',
  });

export function normalizeProfileUpdate(input: unknown) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'Invalid profile payload.',
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function isProfileOwner(profileUserId: string, authUserId: string) {
  return profileUserId === authUserId;
}
