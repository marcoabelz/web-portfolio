// Dark is the site's own default, so the operating system does not get a vote:
// only a visitor who picked light in the toggle gets light.
const themeScript = `(() => {
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem("portfolio-theme");
  } catch {}

  try {
    document.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark";
  } catch {}
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
