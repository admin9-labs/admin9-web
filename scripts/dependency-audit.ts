import { spawnSync } from 'node:child_process';
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

export default function unreviewedAdvisories(report: AuditReport): Advisory[] {
  if (report.error || !report.advisories || !report.metadata?.vulnerabilities) {
    throw new Error('Dependency audit did not return a complete report');
  }
  const advisories = Object.values(report.advisories);
  ['info', 'low', 'moderate', 'high', 'critical'].forEach((severity) => {
    const count = report.metadata.vulnerabilities[severity];
    const findings = advisories
      .filter((advisory) => advisory.severity === severity)
      .reduce((total, advisory) => total + advisory.findings.length, 0);
    if (!Number.isInteger(count) || count < 0 || findings !== count) {
      throw new Error(`Dependency audit ${severity} totals do not match its findings`);
    }
  });
  return advisories;
}

function main() {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error('Run this check with pnpm audit:dependencies');
  const result = spawnSync(process.execPath, [pnpmPath, 'audit', '--json'], { encoding: 'utf8' });
  if (result.error || result.signal || ![0, 1].includes(result.status ?? -1) || !result.stdout.trim()) {
    throw result.error ?? new Error(result.stderr || 'Dependency audit failed');
  }
  const report = JSON.parse(result.stdout) as AuditReport;
  const unreviewed = unreviewedAdvisories(report);
  process.stdout.write(`Audit totals: ${JSON.stringify(report.metadata.vulnerabilities)}\n`);
  if (unreviewed.length) {
    process.stderr.write(`${JSON.stringify(unreviewed, null, 2)}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('No dependency advisories at any severity.\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
