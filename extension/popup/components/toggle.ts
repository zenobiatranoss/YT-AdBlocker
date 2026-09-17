export function setToggleState(
  element: HTMLElement,
  enabled: boolean
): void {
  element.textContent = enabled ? "ON" : "OFF"
  element.setAttribute("aria-pressed", String(enabled))
}
