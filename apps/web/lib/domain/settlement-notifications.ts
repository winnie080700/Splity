import { SETTLEMENT_TRANSFER_STATUS } from "./status";

export function areAllStatusesReceived(statuses: (number | undefined)[]) {
  return (
    statuses.length > 0 &&
    statuses.every((status) => status === SETTLEMENT_TRANSFER_STATUS.received)
  );
}
