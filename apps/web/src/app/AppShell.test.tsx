import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders MT-Prompt and the four primary routes", () => {
    render(<MemoryRouter initialEntries={["/library"]}><AppShell /></MemoryRouter>);
    expect(screen.getByText("MT-Prompt")).toBeVisible();
    for (const label of ["Prompt 库", "Prompt 生成器", "模板与技能", "设置"]) expect(screen.getByRole("link", { name: label })).toBeVisible();
    expect(screen.getByRole("link", { name: "Prompt 库" })).toHaveAttribute("aria-current", "page");
  });
});
