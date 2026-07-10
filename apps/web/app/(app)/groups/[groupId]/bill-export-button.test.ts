import { describe, expect, it } from "vitest";

import { getBillsExportReportHeight, sanitizeExportFilename } from "./bills-export-report-utils";

const bill = (items: number, shares: number) => ({
  items: Array.from({ length: items }, () => ({ amount: "RM 10.00", description: "Item", participants: ["Kai"] })),
  shares: Array.from({ length: shares }, () => ({ fee: "RM 0.00", participant: "Kai", preFee: "RM 10.00", total: "RM 10.00" })),
});

describe("Bills export report", () => {
  it("sanitizes filenames and grows by the longest table", () => {
    expect(sanitizeExportFilename("splity-Kai / July-bills-report")).toBe("splity-Kai-July-bills-report");
    expect(getBillsExportReportHeight([bill(3, 1)])).toBe(getBillsExportReportHeight([bill(1, 3)]));
    expect(getBillsExportReportHeight([bill(3, 1)])).toBeGreaterThan(getBillsExportReportHeight([bill(1, 1)]));
  });
});
