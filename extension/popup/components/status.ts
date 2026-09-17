export function setStatus(
  element: HTMLElement,
  enabled: boolean
): void {
  element.textContent = enabled ? "Active" : "Disabled"
}
