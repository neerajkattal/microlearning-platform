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
      user: { id: 1, username: "alice", avatar: "astronaut" },
    });
    const onAuthenticated = vi.fn();

    const { container } = render(<LoginScreen onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(api.login).toHaveBeenCalledWith({ username: "alice", password: "correct-horse" })
    );
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: 1, username: "alice", avatar: "astronaut" }));
  });

  it("switches to register mode and calls api.register on submit", async () => {
    vi.spyOn(api, "register").mockResolvedValue({
      access_token: "tok",
      token_type: "bearer",
      user: { id: 2, username: "bob", avatar: "astronaut" },
    });
    const onAuthenticated = vi.fn();

    const { container } = render(<LoginScreen onAuthenticated={onAuthenticated} />);
    fireEvent.click(screen.getByText("Register"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "bob" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith({ username: "bob", password: "correct-horse", avatar: "astronaut" })
    );
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: 2, username: "bob", avatar: "astronaut" }));
  });

  it("sends the chosen avatar when picked before registering", async () => {
    vi.spyOn(api, "register").mockResolvedValue({
      access_token: "tok",
      token_type: "bearer",
      user: { id: 3, username: "dave", avatar: "dragon" },
    });

    const { container } = render(<LoginScreen onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByText("Register"));
    fireEvent.click(screen.getByLabelText("Dragon"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "dave" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith({ username: "dave", password: "correct-horse", avatar: "dragon" })
    );
  });

  it("does not show the avatar picker in login mode", () => {
    render(<LoginScreen onAuthenticated={vi.fn()} />);
    expect(screen.queryByLabelText("Choose your character")).toBeNull();
  });

  it("switches to register mode when the demo widget's CTA is clicked", () => {
    render(<LoginScreen onAuthenticated={vi.fn()} />);

    fireEvent.click(screen.getByText("Mars"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Pacific"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Experience Points"));
    fireEvent.click(screen.getByText("See results →"));
    fireEvent.click(screen.getByText("Create free account"));

    expect(screen.getByText("Create account")).toBeTruthy(); // submit button now in register mode
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
