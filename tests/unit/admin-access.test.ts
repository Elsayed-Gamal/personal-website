import { describe, expect, it } from "vitest";
import { isAdminUser } from "../../src/lib/auth/admin-access";

const email = "owner@example.com";
const owner = {
  email,
  email_confirmed_at: "2026-10-23T00:00:00Z",
  is_anonymous: false,
};
describe("admin authorization", () => {
  it("allows only the configured confirmed account", () => {
    expect(isAdminUser(owner, email)).toBe(true);
    expect(isAdminUser(owner, " OWNER@EXAMPLE.COM ")).toBe(true);
    expect(isAdminUser({ ...owner, email: "other@example.com" }, email)).toBe(
      false,
    );
  });
  it("fails closed for missing configuration, missing identity, unconfirmed and anonymous users", () => {
    expect(isAdminUser(owner, "")).toBe(false);
    expect(isAdminUser(null, email)).toBe(false);
    expect(
      isAdminUser({ ...owner, email_confirmed_at: undefined }, email),
    ).toBe(false);
    expect(isAdminUser({ ...owner, is_anonymous: true }, email)).toBe(false);
    expect(isAdminUser({ ...owner, email: undefined }, email)).toBe(false);
  });
  it("does not accept a role from user-editable metadata", () => {
    const impostor = {
      ...owner,
      email: "other@example.com",
      user_metadata: { role: "admin", email },
    };
    expect(isAdminUser(impostor, email)).toBe(false);
  });
});
