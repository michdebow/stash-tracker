import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "../button";

describe("Button", () => {
  it("applies default variant and size classes", () => {
    render(<Button>Submit</Button>);

    const button = screen.getByRole("button", { name: "Submit" });
    const expectedClasses = buttonVariants({ variant: "default", size: "default" });

    expectedClasses.split(" ").forEach((className) => {
      if (!className) return;
      expect(button.classList.contains(className)).toBe(true);
    });
  });

  it("supports the destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: "Delete" });
    const expectedClasses = buttonVariants({ variant: "destructive", size: "default" });

    expectedClasses.split(" ").forEach((className) => {
      if (!className) return;
      expect(button.classList.contains(className)).toBe(true);
    });
  });

  it("renders child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/docs">Read docs</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Read docs" });
    const expectedClasses = buttonVariants({ variant: "default", size: "default" });

    expectedClasses.split(" ").forEach((className) => {
      if (!className) return;
      expect(link.classList.contains(className)).toBe(true);
    });
  });
});
