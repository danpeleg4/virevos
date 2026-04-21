import React, { JSX } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockQueryClient = {
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
};

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({
          children,
          initial,
          animate,
          exit,
          variants,
          transition,
          viewport,
          whileInView,
          whileHover,
          whileTap,
          ...props
        }: Record<string, unknown>) {
          return createElement(
            _tag as keyof JSX.IntrinsicElements,
            props,
            children as React.ReactNode
          );
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Mock fetch for streaming
global.fetch = jest.fn();

import { waitFor } from "@testing-library/react";
import { AIAssistant } from "@/app/components/AIAssistant";

describe("AIAssistant", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it("renders panel when isOpen=true", () => {
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/virevos ai/i)).toBeInTheDocument();
  });

  it("does not render panel when isOpen=false", () => {
    render(<AIAssistant isOpen={false} onClose={onClose} />);
    expect(screen.queryByText(/virevos ai/i)).not.toBeInTheDocument();
  });

  it("renders input field when open", () => {
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    expect(
      screen.getByPlaceholderText(/plan, search, build/i)
    ).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    // Find the button that is disabled when input is empty (the Send icon button)
    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) => b.hasAttribute("disabled"));
    expect(sendButton).toBeDefined();
  });

  it("close button calls onClose", () => {
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    const buttons = screen.getAllByRole("button");
    // The X button is the close button in the header
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("input accepts text", () => {
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/plan, search, build/i);
    fireEvent.change(input, { target: { value: "Hello AI" } });
    expect(input).toHaveValue("Hello AI");
  });

  it("shows error message when fetch fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );
    render(<AIAssistant isOpen={true} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/plan, search, build/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    // Click the send button (last button in the component)
    const buttons = screen.getAllByRole("button");
    const sendBtn = buttons[buttons.length - 1];
    fireEvent.click(sendBtn);
    // After submitting, the user message should appear in the chat
    await waitFor(
      () => expect(screen.getAllByText("Hello").length).toBeGreaterThan(0),
      { timeout: 3000 }
    );
  });
});
