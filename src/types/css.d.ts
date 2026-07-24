/**
 * Side-effect CSS imports (e.g. `import "./viewer.css"` in the webview) are
 * handled by esbuild, which bundles the stylesheet alongside the webview JS.
 * This ambient declaration just tells TypeScript the specifier resolves.
 */
declare module "*.css";
