export function formatOrderNumber(value: string | number) {
  return `YK-${String(value).padStart(5, "0")}`;
}