import React from "react";
import { render } from "vitest-browser-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";

describe("DropdownMenu with asChild trigger", () => {
  it("opens when the wrapped <button> is clicked", async () => {
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
    await screen.getByRole("button", { name: "Sort" }).click();
    await expect.element(screen.getByText("Name (A-Z)")).toBeInTheDocument();
  });

  it("fires the consumer's onClick on a DropdownMenuItem and closes", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Sort</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onClick}>Name (A-Z)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await screen.getByRole("button", { name: "Sort" }).click();
    await screen.getByText("Name (A-Z)").click();
    expect(onClick).toHaveBeenCalledTimes(1);
    await expect
      .element(screen.getByText("Name (A-Z)"))
      .not.toBeInTheDocument();
  });
});
