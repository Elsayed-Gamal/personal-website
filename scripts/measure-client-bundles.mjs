import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

const [before, after = "."] = process.argv.slice(2);
if (!before)
  throw new Error(
    "Usage: node scripts/measure-client-bundles.mjs <baseline-root> [current-root]",
  );
const entries = [
  [
    "public-layout-tracker",
    "[locale]/(site)/page",
    "/analytics/page-view-tracker.tsx",
  ],
  [
    "admin-content-list",
    "admin/(protected)/content/page",
    "/admin/content-manager.tsx",
  ],
];
function measure(root, route, suffix) {
  const context = {};
  runInNewContext(
    readFileSync(
      resolve(root, `.next/server/app/${route}_client-reference-manifest.js`),
      "utf8",
    ),
    context,
  );
  const manifest = Object.values(context.__RSC_MANIFEST)[0];
  const entry = Object.entries(manifest.clientModules).find(([key]) =>
    key.endsWith(suffix),
  );
  if (!entry) throw new Error(`Client module missing: ${suffix}`);
  const files = [
    ...new Set(entry[1].chunks.filter((file) => file.endsWith(".js"))),
  ].map((file) => {
    const content = readFileSync(
      resolve(root, ".next", decodeURIComponent(file)),
    );
    return {
      file,
      rawBytes: content.length,
      gzipBytes: gzipSync(content).length,
    };
  });
  return {
    files,
    rawBytes: files.reduce((sum, item) => sum + item.rawBytes, 0),
    gzipBytes: files.reduce((sum, item) => sum + item.gzipBytes, 0),
  };
}
console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      scope:
        "Chunks referenced by each client entry, not total page JS. Excludes shared runtime and deferred dynamic imports; gzip is measured locally per file.",
      entries: entries.map(([name, route, suffix]) => ({
        name,
        before: measure(before, route, suffix),
        after: measure(after, route, suffix),
      })),
    },
    null,
    2,
  ),
);
