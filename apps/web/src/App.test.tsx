import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// This screen never reaches the Lane Rush game, but App imports it eagerly,
// and real Phaser touches canvas APIs at import time that jsdom doesn't
// implement — so it's stubbed out here the same way LaneRush.test.tsx does.
vi.mock("phaser", () => ({ default: { Game: class {}, Scene: class {}, AUTO: 0 } }));

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the app title", () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    render(<App />);
    expect(screen.getByText("Microlearning Platform")).toBeTruthy();
  });

  it("shows the API as connected once /api/health resolves ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    render(<App />);
    await waitFor(() => expect(screen.getByText(/connected/).textContent).toBe("API: connected"));
    expect(fetch).toHaveBeenCalledWith("/api/health");
  });

  it("shows the API as unreachable if the health check fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/unreachable/).textContent).toBe("API: unreachable"));
  });
});
