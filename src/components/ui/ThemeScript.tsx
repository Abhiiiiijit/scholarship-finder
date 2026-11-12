// Light and dark theme. The pick is a single word in localStorage on this device; with no pick the
// phone's own setting decides (and follows it if it changes). Nothing about the student is stored or sent.
export const THEME_KEY = "paatra.theme";

// Runs in <head> before the first paint, so a dark-theme phone never flashes white. A server
// component: the script is rendered once into the HTML and never re-run by React.
const SCRIPT = `(function(){var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){var p=null;try{p=localStorage.getItem("${THEME_KEY}")}catch(e){}document.documentElement.classList.toggle("dark",p?p==="dark":m.matches)};a();m.addEventListener("change",a)})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
