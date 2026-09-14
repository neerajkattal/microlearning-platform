import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvatarPicker } from "./AvatarPicker";

describe("AvatarPicker", () => {
  afterEach(cleanup);

  it("renders every avatar option", () => {
    render(<AvatarPicker value="astronaut" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Robot")).toBeTruthy();
    expect(screen.getByLabelText("Dragon")).toBeTruthy();
  });

  it("marks the current value as pressed", () => {
    render(<AvatarPicker value="robot" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Robot").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Dragon").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with the clicked avatar's key", () => {
    const onChange = vi.fn();
    render(<AvatarPicker value="astronaut" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Ninja"));
    expect(onChange).toHaveBeenCalledWith("ninja");
  });
});
