/** A user's profile row from public.profiles. */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  weight_unit: 'lbs' | 'kg';
  created_at: string;
  updated_at: string;
}
