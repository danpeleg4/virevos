import React from "react";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";

describe("DropdownMenu with asChild trigger (real-event sequence)", () => {
  it("opens via userEvent click on the wrapped button", async () => {
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Sort</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Name (A-Z)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await expect
      .element(screen.getByText("Name (A-Z)"))
      .not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sort" }));
    await expect.element(screen.getByText("Name (A-Z)")).toBeInTheDocument();
  });
});
