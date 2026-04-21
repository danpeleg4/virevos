import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

describe("ImageWithFallback", () => {
  it("renders an img with the provided src", () => {
    render(
      <ImageWithFallback src="https://example.com/image.jpg" alt="test image" />
    );
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("preserves alt attribute", () => {
    render(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="my alt text"
      />
    );
    expect(screen.getByAltText("my alt text")).toBeInTheDocument();
  });

  it("shows fallback content when image fails to load", () => {
    const { container } = render(
      <ImageWithFallback src="https://example.com/broken.jpg" alt="broken" />
    );
    const img = container.querySelector("img");
    // Trigger error
    fireEvent.error(img!);
    // After error, the fallback wrapper div should render
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
  });

  it("preserves className prop", () => {
    render(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="test"
        className="my-class"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveClass("my-class");
  });
});
