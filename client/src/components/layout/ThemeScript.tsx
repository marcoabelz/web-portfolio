const themeScript = `(() => {
  let prefersDark = false;
  let savedTheme = null;

  try {
    prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {}

  try {
    savedTheme = localStorage.getItem("portfolio-theme");
  } catch {}

  const shouldUseDark =
    savedTheme === "dark" || (savedTheme !== "light" && prefersDark);

  try {
    document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
  } catch {}
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
