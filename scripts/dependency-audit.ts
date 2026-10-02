import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Advisory {
  github_advisory_id: string;
  module_name: string;
  severity: string;
  findings: { version: string; paths: string[] }[];
}

interface AuditReport {
  advisories: Record<string, Advisory>;
  metadata: { vulnerabilities: Record<string, number> };
  error?: unknown;
}

const websocketAdvisories = new Set(['GHSA-vrm6-8vpv-qv8q', 'GHSA-v9p9-hfj2-hcw8', 'GHSA-vxpw-j846-p89q']);

export default function unreviewedAdvisories(report: AuditReport, generatorVersion: string): Advisory[] {
  if (report.error || !report.advisories || !report.metadata?.vulnerabilities) {
    throw new Error('Dependency audit did not return a complete report');
  }
  const highRisk = Object.values(report.advisories).filter((advisory) => ['high', 'critical'].includes(advisory.severity));
  const { high, critical } = report.metadata.vulnerabilities;
  if (!Number.isInteger(high) || !Number.isInteger(critical) || highRisk.length !== high + critical) {
    throw new Error('Dependency audit high/critical totals do not match its findings');
  }

  return highRisk.filter((advisory) => {
    // The pinned local-file generator uses Node's fetch, never Undici WebSocket.
    // Scope the exception to this version and sole consumer, not the package globally.
    const reviewed =
      generatorVersion === '6.7.6' &&
      advisory.severity === 'high' &&
      advisory.module_name === 'undici' &&
      websocketAdvisories.has(advisory.github_advisory_id) &&
      advisory.findings.length > 0 &&
      advisory.findings.every(
        (finding) =>
          finding.version === '5.29.0' &&
          finding.paths.length > 0 &&
          finding.paths.every((consumer) => consumer === '.>openapi-typescript>undici')
      );
    return !reviewed;
  });
}

function main() {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error('Run this check with pnpm audit:dependencies');
  const result = spawnSync(process.execPath, [pnpmPath, 'audit', '--json'], { encoding: 'utf8' });
  if (result.error || result.signal || ![0, 1].includes(result.status ?? -1) || !result.stdout.trim()) {
    throw result.error ?? new Error(result.stderr || 'Dependency audit failed');
  }
  const require = createRequire(import.meta.url);
  const generator = JSON.parse(readFileSync(require.resolve('openapi-typescript/package.json'), 'utf8'));
  const report = JSON.parse(result.stdout) as AuditReport;
  const unreviewed = unreviewedAdvisories(report, generator.version);
  process.stdout.write(`Audit totals (before scoped exceptions): ${JSON.stringify(report.metadata.vulnerabilities)}\n`);
  if (unreviewed.length) {
    process.stderr.write(`${JSON.stringify(unreviewed, null, 2)}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('No unreviewed high/critical advisories. See docs/dependency-security.md for scoped exceptions.\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
