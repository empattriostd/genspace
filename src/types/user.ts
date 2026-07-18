export type UserRole = 'student' | 'teacher';

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  xp: number;
  level: number;
  avatarUrl?: string;
}
