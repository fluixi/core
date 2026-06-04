#!/usr/bin/env node
/**
 * toggle-link-deps.mjs
 *
 * Switches the package's `link:` workspace dependencies between local linking
 * and the published version ("*"), and back again.
 *
 *   node scripts/toggle-link-deps.mjs published   # link:../… → "*"
 *   node scripts/toggle-link-deps.mjs local       # "*" → link:../…  (restored)
 *   node scripts/toggle-link-deps.mjs toggle      # auto-detect and flip (default)
 *   node scripts/toggle-link-deps.mjs status      # print current mode
 *
 * Only dependencies that were originally `link:` are ever touched — genuinely
 * published deps (already "*", "^x", etc.) are left alone.
 *
 * The original `link:` paths are remembered in scripts/link-deps.json so they
 * can be restored after switching to "*". Keep that file committed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_PATH = path.resolve(__dirname, "..", "package.json");
const STORE_PATH = path.resolve(__dirname, "link-deps.json");

const PUBLISHED = "*";
const SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJSON = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

/** All deps whose current value is a `link:` reference → { name: value }. */
function currentLinks(pkg) {
  const out = {};
  for (const section of SECTIONS) {
    for (const [name, value] of Object.entries(pkg[section] ?? {})) {
      if (typeof value === "string" && value.startsWith("link:")) out[name] = value;
    }
  }
  return out;
}

const loadStore = () => (existsSync(STORE_PATH) ? readJSON(STORE_PATH) : {});

/** Apply a value to a dep wherever it appears across sections. Returns count. */
function setDep(pkg, name, value) {
  let n = 0;
  for (const section of SECTIONS) {
    if (pkg[section] && name in pkg[section] && pkg[section][name] !== value) {
      pkg[section][name] = value;
      n++;
    }
  }
  return n;
}

function toPublished() {
  const pkg = readJSON(PKG_PATH);
  const store = loadStore();
  // Record any link: deps currently present so we can restore them later.
  Object.assign(store, currentLinks(pkg));
  if (Object.keys(store).length === 0) {
    console.log("No link: deps and no stored mappings — nothing to do.");
    return;
  }
  let n = 0;
  for (const name of Object.keys(store)) n += setDep(pkg, name, PUBLISHED);
  writeJSON(STORE_PATH, store);
  writeJSON(PKG_PATH, pkg);
  console.log(
    `→ published: set ${n} dep(s) to "${PUBLISHED}" ` +
      `(${Object.keys(store).length} mappings saved in ${path.basename(STORE_PATH)})`,
  );
}

function toLocal() {
  const pkg = readJSON(PKG_PATH);
  const store = loadStore();
  if (Object.keys(store).length === 0) {
    console.log(
      `No stored mappings (${path.basename(STORE_PATH)}). ` +
        `Run "published" once while deps are still link: to record them.`,
    );
    return;
  }
  let n = 0;
  for (const [name, link] of Object.entries(store)) n += setDep(pkg, name, link);
  writeJSON(PKG_PATH, pkg);
  console.log(`→ local: restored ${n} dep(s) to their link: paths`);
}

function status() {
  const pkg = readJSON(PKG_PATH);
  const links = Object.keys(currentLinks(pkg));
  const stored = Object.keys(loadStore());
  if (links.length > 0) {
    console.log(`local — ${links.length} dep(s) currently linked`);
  } else if (stored.length > 0) {
    console.log(`published — ${stored.length} dep(s) set to "*" (restorable)`);
  } else {
    console.log("no link: deps and no stored mappings");
  }
}

const mode = (process.argv[2] ?? "toggle").toLowerCase();
switch (mode) {
  case "published":
  case "unlink":
    toPublished();
    break;
  case "local":
  case "link":
    toLocal();
    break;
  case "status":
    status();
    break;
  case "toggle": {
    const pkg = readJSON(PKG_PATH);
    Object.keys(currentLinks(pkg)).length > 0 ? toPublished() : toLocal();
    break;
  }
  default:
    console.error(`Unknown mode "${mode}". Use: local | published | toggle | status`);
    process.exit(1);
}
