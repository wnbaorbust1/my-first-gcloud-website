import { describe, expect, it } from "vitest";

import { TASK_TEMPLATES } from "@/lib/roadmap/task-templates";

import { BLUEPRINT_DESTINATION_TO_FOLDER, VAULT_FOLDERS } from "./vault";

describe("BLUEPRINT_DESTINATION_TO_FOLDER", () => {
  it("maps every real TaskTemplate.blueprintDestination to a real Vault folder", () => {
    const destinations = new Set(TASK_TEMPLATES.map((t) => t.blueprintDestination));
    for (const dest of destinations) {
      const folder = BLUEPRINT_DESTINATION_TO_FOLDER[dest];
      expect(folder, `no folder mapped for blueprintDestination "${dest}"`).toBeDefined();
      expect(VAULT_FOLDERS).toContain(folder);
    }
  });

  it("every mapped folder is one of the spec's 17 folders", () => {
    for (const folder of Object.values(BLUEPRINT_DESTINATION_TO_FOLDER)) {
      expect(VAULT_FOLDERS).toContain(folder);
    }
  });
});

describe("VAULT_FOLDERS", () => {
  it("has no duplicates", () => {
    expect(new Set(VAULT_FOLDERS).size).toBe(VAULT_FOLDERS.length);
  });
});
