// The changelog page, built from the CHANGELOG.md that changesets writes in each package, so the
// site shows release notes without the repository. Grouped by release, newest first, then by
// package. Lines that only say a dependency moved are dropped: they repeat the release itself.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function writeChangelog({ packagesDir, reference, outDir, title, intro }) {
  const releases = new Map();
  for (const dir of readdirSync(packagesDir)) {
    const pkgFile = join(packagesDir, dir, 'package.json');
    const logFile = join(packagesDir, dir, 'CHANGELOG.md');
    if (!existsSync(pkgFile) || !existsSync(logFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    if (pkg.private) continue;
    for (const section of readFileSync(logFile, 'utf8').split(/^## /m).slice(1)) {
      const version = section.slice(0, section.indexOf('\n')).trim();
      const entries = { Major: [], Minor: [], Patch: [] };
      let kind = 'Patch';
      for (const line of section.split('\n').slice(1)) {
        const heading = line.match(/^### (Major|Minor|Patch) Changes/);
        if (heading) kind = heading[1];
        else if (/^- @?[\w./-]+@\S+$/.test(line.trim()) || /^- Updated dependencies/.test(line.trim())) continue;
        else if (line.startsWith('- ')) entries[kind].push(line.replace(/^- [0-9a-f]{7,}: /, '- '));
        else if (/^\s+\S/.test(line) && entries[kind].length) entries[kind][entries[kind].length - 1] += `\n${line}`;
      }
      const lines = [...entries.Major, ...entries.Minor, ...entries.Patch];
      if (!lines.length) continue;
      if (!releases.has(version)) releases.set(version, []);
      releases.get(version).push({ name: pkg.name, lines });
    }
  }

  const order = (v) => v.split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const newer = (a, b) => {
    const [x, y] = [order(a), order(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if (x[i] === y[i]) continue;
      if (x[i] === undefined) return -1;
      if (y[i] === undefined) return 1;
      return x[i] > y[i] ? -1 : 1;
    }
    return 0;
  };

  // Version strings do not give the order (`1.0.0-next` came before `1.0.0-alpha`), but each
  // changelog lists its releases newest first: the reference package's list decides, and the
  // version comparison only places what it lacks.
  const listed = readFileSync(join(packagesDir, reference, 'CHANGELOG.md'), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.slice(3).trim());
  // A channel is the version without its release number: `1.0.0-alpha` for `1.0.0-alpha.112`.
  const channel = (v) => v.replace(/\.\d+$/, '');
  const channels = [...new Set(listed.map(channel))];
  const byRelease = (a, b) => {
    const [ca, cb] = [channels.indexOf(channel(a)), channels.indexOf(channel(b))];
    if (ca === -1 || cb === -1) return newer(a, b);
    if (ca !== cb) return ca - cb;
    return Number(b.match(/(\d+)$/)[1]) - Number(a.match(/(\d+)$/)[1]);
  };

  const body = [...releases.keys()]
    .sort(byRelease)
    .map((version) => {
      const pkgs = releases.get(version).sort((a, b) => a.name.localeCompare(b.name));
      return `## ${version}\n\n${pkgs.map((p) => `### ${p.name}\n\n${p.lines.join('\n')}`).join('\n\n')}`;
    })
    .join('\n\n');

  for (const [lang, heading] of Object.entries(title)) {
    writeFileSync(join(outDir, lang, 'changelog.md'), `# ${heading}\n\n${intro[lang]}\n\n${body}\n`);
  }
  return releases.size;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = writeChangelog({
    packagesDir: join(root, '../packages'),
    reference: 'core',
    outDir: join(root, 'src/content/v1'),
    title: { en: 'Changelog', fr: 'Journal des modifications' },
    intro: {
      en: 'Every release of the Fluixi packages, newest first.',
      fr: 'Chaque version des paquets Fluixi, de la plus récente à la plus ancienne. Les notes sont en anglais.',
    },
  });
  console.log(`  ✓ changelog.md (${count} releases)`);
}
