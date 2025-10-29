import { User as FirebaseUser } from 'firebase/auth';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt?: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  phone: string;
  address?: string;
}

export type FirebaseAuthUser = FirebaseUser;
