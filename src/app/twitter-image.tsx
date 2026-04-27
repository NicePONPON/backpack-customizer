// Twitter card reuses the OG composition. `runtime` has to be declared
// statically per Next.js segment-config rules, so it can't be re-exported.
export const runtime = "edge";
export { default, alt, size, contentType } from "./opengraph-image";
