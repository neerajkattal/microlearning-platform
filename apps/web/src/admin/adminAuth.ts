// A completely separate token from the player's (auth.ts's
// "microlearning_token") - an admin token and a player token must
// never be interchangeable, and keeping them in different storage
// keys means logging out of one never accidentally touches the other.
const ADMIN_TOKEN_KEY = "microlearning_admin_token";

// Reads the stored admin JWT, if any.
export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Persists the admin JWT returned by login/bootstrap.
export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Private browsing / storage disabled - the session just won't persist.
  }
}

// Removes the stored admin JWT (logout, or a 401/403 telling us it's stale).
export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // see setAdminToken
  }
}
