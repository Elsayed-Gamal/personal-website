type Identity = {
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
};

export function isAdminUser(
  user: Identity | null,
  email = process.env.SUPABASE_ADMIN_EMAIL,
) {
  return Boolean(
    email?.trim() &&
    user?.email_confirmed_at &&
    !user.is_anonymous &&
    user.email?.toLowerCase() === email.trim().toLowerCase(),
  );
}
