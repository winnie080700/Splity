import { getApiErrorMessage } from "@api-client";

export function formatCurrency(value: number) {
  return `RM ${value.toFixed(2)}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "?";
}

export function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error);
}
