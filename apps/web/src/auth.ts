const TOKEN_KEY = "microlearning_token";

// Reads the stored JWT, if any (null in private browsing / storage disabled).
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Persists the JWT returned by login/register.
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private browsing / storage disabled — the session just won't
    // persist across a reload, which is a reasonable degradation.
  }
}

// Removes the stored JWT (logout, or a 401 telling us it's stale).
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // see setToken
  }
}
