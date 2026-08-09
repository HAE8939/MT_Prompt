import { describe, expect, it } from "vitest";
import { models, skills } from "./seed-data.js";

describe("built-in knowledge", () => {
  it("contains four models, nineteen tasks, and fifteen skills", () => {
    expect(models).toHaveLength(4);
    expect(models.flatMap((model) => model.tasks)).toHaveLength(19);
    expect(models.every((model) => model.tasks.every((task) => task.template))).toBe(true);
    expect(skills).toHaveLength(15);
  });

  it("uses unique stable keys", () => {
    const modelKeys = models.map((model) => model.key);
    const taskKeys = models.flatMap((model) => model.tasks.map((task) => task.key));
    const templateKeys = models.flatMap((model) => model.tasks.map((task) => task.template.key));
    const skillKeys = skills.map((skill) => skill.key);

    expect(new Set(modelKeys).size).toBe(modelKeys.length);
    expect(new Set(taskKeys).size).toBe(taskKeys.length);
    expect(new Set(templateKeys).size).toBe(templateKeys.length);
    expect(new Set(skillKeys).size).toBe(skillKeys.length);
  });
});
