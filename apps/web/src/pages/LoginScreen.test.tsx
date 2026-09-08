import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";
import { api } from "../api";

vi.mock("../auth", () => ({
  setToken: vi.fn(),
}));

describe("LoginScreen", () => {
  afterEach(cleanup);

  it("defaults to login mode and calls api.login on submit", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok",
      token_type: "bearer",
      user: { id: 1, username: "alice" },
    });
    const onAuthenticated = vi.fn();

    const { container } = render(<LoginScreen onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(api.login).toHaveBeenCalledWith({ username: "alice", password: "correct-horse" })
    );
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: 1, username: "alice" }));
  });

  it("switches to register mode and calls api.register on submit", async () => {
    vi.spyOn(api, "register").mockResolvedValue({
      access_token: "tok",
      token_type: "bearer",
      user: { id: 2, username: "bob" },
    });
    const onAuthenticated = vi.fn();

    const { container } = render(<LoginScreen onAuthenticated={onAuthenticated} />);
    fireEvent.click(screen.getByText("Register"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "bob" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith({ username: "bob", password: "correct-horse" })
    );
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: 2, username: "bob" }));
  });

  it("shows an error message when login fails", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("401"));
    const { container } = render(<LoginScreen onAuthenticated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(screen.getByText("Invalid username or password.")).toBeTruthy());
  });
});
