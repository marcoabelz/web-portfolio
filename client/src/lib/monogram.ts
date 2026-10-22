// The letters shown for a skill with no logo. Shared by the site (icons.ts, server only)
// and the editor's icon preview, so both draw the same fallback.
export function defaultMonogram(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "");
  // A name with no ASCII letters or digits still gets a visible mark.
  if (!letters) return Array.from(name.trim())[0] ?? "?";
  return (letters.length <= 3 ? letters : letters.slice(0, 2)).toUpperCase();
}
