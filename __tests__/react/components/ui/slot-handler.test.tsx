/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";

describe("Slot in DropdownMenuTrigger asChild — DOM inspection", () => {
  it("propagates aria, data-state, and onClick onto the cloned <button>", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Sort</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const btn = screen.getByRole("button", { name: "Sort" });
    expect(btn.getAttribute("aria-haspopup")).toBe("menu");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.getAttribute("data-state")).toBe("closed");
    expect(btn.getAttribute("data-slot")).toBe("dropdown-menu-trigger");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("data-state")).toBe("open");
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("preserves the user's inline button children", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>
            <span data-testid="icon" />
            Sort
            <span data-testid="dot" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByTestId("dot")).toBeInTheDocument();
    expect(screen.getByText("Sort")).toBeInTheDocument();
  });
});
