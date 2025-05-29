// src/utils/authFetch.js
import { getAuth } from "firebase/auth";

export async function authFetch(url, options = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("User not authenticated");
  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "X-User-Uid": user.uid,
      "Content-Type": "application/json",
    },
  });
}