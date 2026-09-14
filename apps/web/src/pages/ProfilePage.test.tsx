import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";
import { api } from "../api";
import type { User } from "../types";

const user: User = { id: 1, username: "alice", avatar: "astronaut" };

describe("ProfilePage", () => {
  afterEach(cleanup);

  it("shows the current avatar and username", () => {
    render(<ProfilePage user={user} onUpdated={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByLabelText("Astronaut").getAttribute("aria-pressed")).toBe("true");
  });

  it("disables Save until a different avatar is picked", () => {
    render(<ProfilePage user={user} onUpdated={vi.fn()} onBack={vi.fn()} />);
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Robot"));
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(false);
  });

  it("saves the new avatar and calls onUpdated", async () => {
    vi.spyOn(api, "updateProfile").mockResolvedValue({ id: 1, username: "alice", avatar: "robot" });
    const onUpdated = vi.fn();
    render(<ProfilePage user={user} onUpdated={onUpdated} onBack={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Robot"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ id: 1, username: "alice", avatar: "robot" }));
    expect(api.updateProfile).toHaveBeenCalledWith({ avatar: "robot" });
  });

  it("shows an error if saving fails", async () => {
    vi.spyOn(api, "updateProfile").mockRejectedValue(new Error("500"));
    render(<ProfilePage user={user} onUpdated={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Robot"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(screen.getByText(/Couldn't save/)).toBeTruthy());
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<ProfilePage user={user} onUpdated={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
