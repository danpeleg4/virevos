/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";

describe("DropdownMenu with asChild trigger (real-event sequence)", () => {
  it("opens via userEvent click on the wrapped button", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Sort</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Name (A-Z)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.queryByText("Name (A-Z)")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sort" }));
    expect(screen.queryByText("Name (A-Z)")).toBeInTheDocument();
  });
});
