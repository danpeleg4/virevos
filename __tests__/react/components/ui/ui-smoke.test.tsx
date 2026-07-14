import React from "react";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

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
  it("Button renders and handles click", async () => {
    const handler = vi.fn();
    const screen = await render(<Button onClick={handler}>Click</Button>);
    await screen.getByRole("button", { name: /click/i }).click();
    expect(handler).toHaveBeenCalled();
  });

  it("Button asChild forwards to child element", async () => {
    const screen = await render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link/i });
    await expect.element(link).toHaveAttribute("href", "/x");
    await expect.element(link).toHaveAttribute("data-slot", "button");
  });

  it("Badge renders with default variant", async () => {
    const screen = await render(<Badge>New</Badge>);
    await expect
      .element(screen.getByText("New", { exact: true }))
      .toBeInTheDocument();
  });

  it("Label renders as <label>", async () => {
    const screen = await render(<Label htmlFor="x">Name</Label>);
    expect(screen.getByText("Name").element().tagName).toBe("LABEL");
  });

  it("Separator renders with orientation", async () => {
    const screen = await render(
      <Separator orientation="vertical" data-testid="sep" />
    );
    await expect
      .element(screen.getByTestId("sep"))
      .toHaveAttribute("data-orientation", "vertical");
  });

  it("Avatar fallback renders when image fails", async () => {
    const screen = await render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    await expect.element(screen.getByText("AB")).toBeInTheDocument();
  });
});

describe("Checkbox / Switch", () => {
  it("Checkbox toggles checked state", async () => {
    const handler = vi.fn();
    const screen = await render(<Checkbox onCheckedChange={handler} />);
    const box = screen.getByRole("checkbox");
    await expect.element(box).toHaveAttribute("data-state", "unchecked");
    await box.click();
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("Switch toggles checked state", async () => {
    const handler = vi.fn();
    const screen = await render(<Switch onCheckedChange={handler} />);
    await screen.getByRole("switch").click();
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("Checkbox respects controlled checked prop", async () => {
    const screen = await render(
      <Checkbox checked={false} onCheckedChange={() => {}} />
    );
    await expect
      .element(screen.getByRole("checkbox"))
      .toHaveAttribute("data-state", "unchecked");
    await screen.rerender(
      <Checkbox checked={true} onCheckedChange={() => {}} />
    );
    await expect
      .element(screen.getByRole("checkbox"))
      .toHaveAttribute("data-state", "checked");
  });
});

describe("Tabs", () => {
  it("renders active tab content and switches on click", async () => {
    const screen = await render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );
    await expect.element(screen.getByText("Panel A")).toBeInTheDocument();
    await expect.element(screen.getByText("Panel B")).not.toBeInTheDocument();
    await screen.getByRole("tab", { name: "B" }).click();
    await expect.element(screen.getByText("Panel B")).toBeInTheDocument();
  });
});

describe("Accordion", () => {
  it("opens and closes a single item", async () => {
    const screen = await render(
      <Accordion type="single" collapsible>
        <AccordionItem value="x">
          <AccordionTrigger>Q</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    await expect.element(screen.getByText("Answer")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Q" }).click();
    await expect.element(screen.getByText("Answer")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Q" }).click();
    await expect.element(screen.getByText("Answer")).not.toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("opens on trigger click and closes via Escape", async () => {
    const screen = await render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    await expect.element(screen.getByText("Title")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Open" }).click();
    await expect.element(screen.getByText("Title")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByText("Title")).not.toBeInTheDocument();
  });

  it("forwards ref to the trigger button (React 19 ref-as-prop)", async () => {
    const ref = React.createRef<HTMLButtonElement>();
    await render(
      <Dialog>
        <DialogTrigger ref={ref}>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe("Open");
  });

  it("supports a function ref on the trigger", async () => {
    let captured: HTMLButtonElement | null = null;
    await render(
      <Dialog>
        <DialogTrigger
          ref={(node) => {
            captured = node;
          }}
        >
          Open
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(captured).toBeInstanceOf(HTMLButtonElement);
  });
});

describe("AlertDialog", () => {
  it("opens, then Cancel closes", async () => {
    const screen = await render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );
    await screen.getByRole("button", { name: "Open" }).click();
    await expect.element(screen.getByText("Confirm")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Cancel" }).click();
    await expect.element(screen.getByText("Confirm")).not.toBeInTheDocument();
  });
});

describe("Popover", () => {
  it("opens on trigger click", async () => {
    const screen = await render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>
    );
    await expect.element(screen.getByText("Body")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Open" }).click();
    await expect.element(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("opens, item click closes and fires onSelect", async () => {
    const onSelect = vi.fn();
    const screen = await render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    await screen.getByRole("button", { name: "Menu" }).click();
    await screen.getByText("Item").click();
    expect(onSelect).toHaveBeenCalled();
  });
});

describe("Select", () => {
  it("renders trigger, shows placeholder, picks an option", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
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
    await expect.element(screen.getByText("Pick")).toBeInTheDocument();
    await screen.getByRole("combobox").click();
    await screen.getByRole("option", { name: "High" }).click();
    expect(onValueChange).toHaveBeenCalledWith("high");
  });
});
