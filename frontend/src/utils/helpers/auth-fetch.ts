import { getAuth } from 'firebase/auth';

/**
 * Authenticated fetch wrapper that automatically includes Firebase auth token
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Promise<Response>
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = getAuth().currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const isFormData = options.body instanceof FormData;

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
      'X-User-Uid': user.uid,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
  });
}
