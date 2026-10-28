export type Theme = "dark";

/** The site is dark only: there is no light theme any more. */
export const currentTheme = (): Theme => "dark";

export function applyTheme(): void {
  document.documentElement.dataset.theme = "dark";
}

/** Runs before the page is drawn (inlined in the document head). The root element also carries data-theme="dark" from the server, so nothing flashes white first. */
export const THEME_BOOT_SCRIPT = `document.documentElement.dataset.theme="dark"`;
