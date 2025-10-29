export interface UserPreferences {
  id?: number;
  userId: string;
  language: string;
  darkMode: boolean;
  emailNotifications: boolean;
  personnalStyleAnalysis: boolean;
  useMeetingScripts: boolean;
  useOwnDocuments: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt?: Date;
}

export interface UpdateUserProfileRequest {
  name?: string;
  phone?: string;
}

export interface UpdatePreferencesRequest extends Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {}
