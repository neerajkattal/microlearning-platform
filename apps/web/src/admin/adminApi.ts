import { clearAdminToken, getAdminToken } from "./adminAuth";
import type {
  ActivityLogEntry,
  AdminCategory,
  AdminQuestion,
  AdminTokenResponse,
  AdminUserDetail,
  GameConfig,
  Stats,
  TopicRequestItem,
} from "./adminTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export class AdminUnauthorizedError extends Error {}

// FastAPI's error body is either {detail: "a plain string"} (an
// HTTPException we raised) or {detail: [{loc, msg, type}, ...]} (a
// Pydantic validation failure it raised itself) - passing the array
// form straight to `new Error(...)` stringifies it to the useless
// "[object Object]", since Error coerces a non-string message with
// plain String(), not JSON.stringify.
function extractErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : String(item)))
      .join("; ");
  }
  return fallback;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  // Destructured out and merged explicitly - spreading `options` last
  // in the fetch() call's object literal would otherwise let its own
  // `headers` key silently replace (not merge with) the ones set here,
  // dropping Content-Type/Authorization whenever a caller (like
  // bootstrap, which sends X-Admin-Key) passes its own headers.
  const { headers: extraHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...restOptions,
  });
  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    const body = await res.json().catch(() => null);
    throw new AdminUnauthorizedError(extractErrorMessage(body, `Request to ${path} failed: ${res.status}`));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, `Request to ${path} failed: ${res.status}`));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const adminApi = {
  bootstrap: (username: string, password: string, adminKey: string) =>
    request<AdminTokenResponse>("/admin/bootstrap", {
      method: "POST",
      headers: { "X-Admin-Key": adminKey },
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AdminTokenResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getStats: () => request<Stats>("/admin/stats"),
  getActivity: (limit = 50) => request<ActivityLogEntry[]>(`/admin/activity?limit=${limit}`),

  listUsers: (search?: string) =>
    request<AdminUserDetail[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  renameUser: (id: number, newUsername: string) =>
    request<AdminUserDetail>(`/admin/users/${id}/rename`, {
      method: "POST",
      body: JSON.stringify({ new_username: newUsername }),
    }),
  hideUser: (id: number) => request<AdminUserDetail>(`/admin/users/${id}/hide`, { method: "POST" }),
  unhideUser: (id: number) => request<AdminUserDetail>(`/admin/users/${id}/unhide`, { method: "POST" }),

  listCategories: () => request<AdminCategory[]>("/admin/categories"),
  createCategory: (name: string, slug: string) =>
    request<AdminCategory>("/admin/categories", { method: "POST", body: JSON.stringify({ name, slug }) }),
  updateCategory: (id: number, payload: { name?: string; is_active?: boolean }) =>
    request<AdminCategory>(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listQuestions: (categoryId?: number, search?: string) => {
    const params = new URLSearchParams();
    if (categoryId != null) params.set("category_id", String(categoryId));
    if (search) params.set("search", search);
    const qs = params.toString();
    return request<AdminQuestion[]>(`/admin/questions${qs ? `?${qs}` : ""}`);
  },
  createQuestion: (payload: {
    text: string;
    category_id: number;
    difficulty: string;
    explanation?: string;
    answers: { text: string; is_correct: boolean }[];
  }) => request<AdminQuestion>("/admin/questions", { method: "POST", body: JSON.stringify(payload) }),
  updateQuestion: (
    id: number,
    payload: { text?: string; difficulty?: string; explanation?: string; is_active?: boolean }
  ) => request<AdminQuestion>(`/admin/questions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getGameConfig: () => request<GameConfig>("/admin/game-config"),
  updateGameConfig: (payload: Partial<GameConfig>) =>
    request<GameConfig>("/admin/game-config", { method: "PATCH", body: JSON.stringify(payload) }),

  listTopicRequests: (status: "pending" | "fulfilled" | "dismissed" | "all" = "pending") =>
    request<TopicRequestItem[]>(`/admin/topic-requests?status=${status}`),
  fulfillTopicRequest: (id: number) =>
    request<TopicRequestItem>(`/admin/topic-requests/${id}/fulfill`, { method: "POST" }),
  dismissTopicRequest: (id: number) =>
    request<TopicRequestItem>(`/admin/topic-requests/${id}/dismiss`, { method: "POST" }),
};
