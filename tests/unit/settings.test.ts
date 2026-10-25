import { describe, expect, it } from "vitest";
import { saveSettingsSchema } from "../../src/lib/admin/settings";
import seed from "../../scripts/page-content-seed.json";

describe("settings input validation", () => {
  it("accepts both languages and only the four editable sections", () => {
    for (const key of ["ui", "home", "about", "contact"] as const)
      for (const locale of ["ar", "en"] as const) {
        expect(
          saveSettingsSchema.safeParse({
            key,
            locale,
            version: "2026-10-23T14:14:03.397561+00:00",
            value: seed[key][locale],
          }).success,
        ).toBe(true);
      }
    expect(saveSettingsSchema.safeParse({ key: "work" }).success).toBe(false);
  });
  it("rejects invalid page content and mismatched value icons", () => {
    const base = { locale: "ar", version: "2026-10-25T00:00:00Z" };
    expect(
      saveSettingsSchema.safeParse({
        ...base,
        key: "contact",
        value: {
          ...seed.contact.ar,
          form: { ...seed.contact.ar.form, success: " " },
        },
      }).success,
    ).toBe(false);
    expect(
      saveSettingsSchema.safeParse({
        ...base,
        key: "contact",
        value: { ...seed.contact.ar, prompts: ["one"] },
      }).success,
    ).toBe(false);
    const value = structuredClone(seed.about.ar);
    value.values[0].icon = "globe";
    expect(
      saveSettingsSchema.safeParse({ ...base, key: "about", value }).success,
    ).toBe(false);
  });
  it("rejects blank text, oversized fields, invalid icons and broken array structure", () => {
    const input = {
      key: "home",
      locale: "ar",
      version: "2026-10-23T00:00:00Z",
      value: structuredClone(seed.home.ar),
    };
    input.value.hero.title = " ";
    expect(saveSettingsSchema.safeParse(input).success).toBe(false);
    input.value.hero.title = "x".repeat(2001);
    expect(saveSettingsSchema.safeParse(input).success).toBe(false);
    input.value.hero.title = "عنوان";
    input.value.services.items[0].icon = "invalid";
    expect(saveSettingsSchema.safeParse(input).success).toBe(false);
    input.value.services.items[0].icon = "globe";
    input.value.process.steps.pop();
    expect(saveSettingsSchema.safeParse(input).success).toBe(false);
  });
});
