import { describe, expect, test } from "vitest";

describe("index", () => {
    test("Should export the expected members.", async () => {
        const expectedExports = ["resolver", "validate"];
        const indexModule = await import("../src/index.js");
        const exportedMembers = Object.keys(indexModule);
        expect(exportedMembers.sort()).toEqual(expectedExports.sort());
    });
});
