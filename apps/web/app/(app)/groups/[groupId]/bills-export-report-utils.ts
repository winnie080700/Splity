export const BILL_GAP = 16;
export const BILLS_START_Y = 336;
export const FOOTER_HEIGHT = 180;

export function getBillsExportReportHeight(bills: { items: unknown[]; shares: unknown[] }[]) {
  const billsHeight = bills.reduce(
    (height, bill) => height + 217 + (Math.max(1, bill.items.length, bill.shares.length) - 1) * 30 + BILL_GAP,
    0
  );
  return BILLS_START_Y + billsHeight + FOOTER_HEIGHT;
}

export function sanitizeExportFilename(filename: string) {
  return filename
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
