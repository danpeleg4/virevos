import React from "react";
import { render } from "vitest-browser-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";

describe("Slot in DropdownMenuTrigger asChild — DOM inspection", () => {
  it("propagates aria, data-state, and onClick onto the cloned <button>", async () => {
    const screen = await render(
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
    await expect.element(btn).toHaveAttribute("aria-haspopup", "menu");
    await expect.element(btn).toHaveAttribute("aria-expanded", "false");
    await expect.element(btn).toHaveAttribute("data-state", "closed");
    await expect
      .element(btn)
      .toHaveAttribute("data-slot", "dropdown-menu-trigger");
    await btn.click();
    await expect.element(btn).toHaveAttribute("aria-expanded", "true");
    await expect.element(btn).toHaveAttribute("data-state", "open");
    await expect.element(screen.getByText("Item")).toBeInTheDocument();
  });

  it("preserves the user's inline button children", async () => {
    const screen = await render(
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
    await expect.element(screen.getByTestId("icon")).toBeInTheDocument();
    await expect.element(screen.getByTestId("dot")).toBeInTheDocument();
    await expect.element(screen.getByText("Sort")).toBeInTheDocument();
  });
});
