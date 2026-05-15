/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Switch } from "@/app/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/app/components/ui/accordion";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/app/components/ui/alert-dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/app/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";

describe("Trivial components", () => {
  it("Button renders and handles click", () => {
    const handler = jest.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(handler).toHaveBeenCalled();
  });

  it("Button asChild forwards to child element", () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link/i });
    expect(link).toHaveAttribute("href", "/x");
    expect(link.getAttribute("data-slot")).toBe("button");
  });

  it("Badge renders with default variant", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("Label renders as <label>", () => {
    render(<Label htmlFor="x">Name</Label>);
    expect(screen.getByText("Name").tagName).toBe("LABEL");
  });

  it("Separator renders with orientation", () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveAttribute("data-orientation", "vertical");
  });

  it("Avatar fallback renders when image fails", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});

describe("Checkbox / Switch", () => {
  it("Checkbox toggles checked state", () => {
    const handler = jest.fn();
    render(<Checkbox onCheckedChange={handler} />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("data-state", "unchecked");
    fireEvent.click(box);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("Switch toggles checked state", () => {
    const handler = jest.fn();
    render(<Switch onCheckedChange={handler} />);
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("Checkbox respects controlled checked prop", () => {
    const { rerender } = render(<Checkbox checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "unchecked");
    rerender(<Checkbox checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
  });
});

describe("Tabs", () => {
  it("renders active tab content and switches on click", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("Panel B")).toBeInTheDocument();
  });
});

describe("Accordion", () => {
  it("opens and closes a single item", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="x">
          <AccordionTrigger>Q</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.queryByText("Answer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Q" }));
    expect(screen.getByText("Answer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Q" }));
    expect(screen.queryByText("Answer")).not.toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("opens on trigger click and closes via Escape", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText("Title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Title")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Title")).not.toBeInTheDocument();
  });
});

describe("AlertDialog", () => {
  it("opens, then Cancel closes", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
  });
});

describe("Popover", () => {
  it("opens on trigger click", () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("opens, item click closes and fires onSelect", () => {
    const onSelect = jest.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Item"));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe("Select", () => {
  it("renders trigger, shows placeholder, picks an option", () => {
    const onValueChange = jest.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Pick")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "High" }));
    expect(onValueChange).toHaveBeenCalledWith("high");
  });
});
