import { describe, expect, it } from "vitest";
import {
  BUILT_IN_MODELS,
  BUILT_IN_SKILLS,
  BUILT_IN_TASKS,
  BUILT_IN_TEMPLATES,
} from "./built-in-catalog";

describe("built-in browser catalog", () => {
  it("ports the complete V1 model, task, template, and Skill catalog", () => {
    expect(BUILT_IN_MODELS).toHaveLength(4);
    expect(BUILT_IN_TASKS).toHaveLength(19);
    expect(BUILT_IN_TEMPLATES).toHaveLength(19);
    expect(BUILT_IN_SKILLS).toHaveLength(15);
  });

  it("keeps every task and template linked by stable key", () => {
    expect(
      BUILT_IN_TASKS.every((task) =>
        BUILT_IN_MODELS.some((model) => model.stableKey === task.modelKey),
      ),
    ).toBe(true);
    expect(
      BUILT_IN_TEMPLATES.every((template) =>
        BUILT_IN_TASKS.some((task) => task.stableKey === template.taskKey),
      ),
    ).toBe(true);
  });

  it("contains unique stable keys and complete compatibility metadata", () => {
    const unique = (keys: readonly string[]) => new Set(keys).size === keys.length;
    expect(unique(BUILT_IN_MODELS.map(({ stableKey }) => stableKey))).toBe(true);
    expect(unique(BUILT_IN_TASKS.map(({ stableKey }) => stableKey))).toBe(true);
    expect(unique(BUILT_IN_TEMPLATES.map(({ stableKey }) => stableKey))).toBe(true);
    expect(unique(BUILT_IN_SKILLS.map(({ stableKey }) => stableKey))).toBe(true);
    expect(
      BUILT_IN_SKILLS.every(({ modelKeys }) =>
        modelKeys?.every((key) =>
          BUILT_IN_MODELS.some((model) => model.stableKey === key),
        ),
      ),
    ).toBe(true);
  });
});
