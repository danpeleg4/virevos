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

describe("DropdownMenu with asChild trigger", () => {
  it("opens when the wrapped <button> is clicked", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Sort" }));
    expect(screen.getByText("Name (A-Z)")).toBeInTheDocument();
  });

  it("fires the consumer's onClick on a DropdownMenuItem and closes", () => {
    const onClick = jest.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Sort</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onClick}>Name (A-Z)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort" }));
    fireEvent.click(screen.getByText("Name (A-Z)"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Name (A-Z)")).not.toBeInTheDocument();
  });
});
