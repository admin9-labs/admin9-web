import assert from 'node:assert/strict';
import test from 'node:test';
import unreviewedAdvisories from './dependency-audit';

function report(severity = 'low') {
  return {
    advisories: {
      '1': {
        github_advisory_id: 'GHSA-vrm6-8vpv-qv8q',
        module_name: 'undici',
        severity,
        findings: [{ version: '5.29.0', paths: ['.>openapi-typescript>undici'] }],
      },
    },
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, [severity]: 1 } },
  };
}

test('advisories at every severity block CI, including previously exempt Undici findings', () => {
  ['info', 'low', 'moderate', 'high', 'critical'].forEach((severity) => {
    assert.equal(unreviewedAdvisories(report(severity)).length, 1);
  });
});

test('a complete audit without advisories passes', () => {
  const clean = report();
  clean.advisories = {} as typeof clean.advisories;
  clean.metadata.vulnerabilities.low = 0;
  assert.deepEqual(unreviewedAdvisories(clean), []);
});

test('audit totals count affected versions, rather than unique advisory IDs', () => {
  const versions = report('moderate');
  versions.advisories['1'].findings.push({ version: '5.28.4', paths: ['.>another-tool>undici'] });
  versions.metadata.vulnerabilities.moderate = 2;
  assert.equal(unreviewedAdvisories(versions).length, 1);
});

test('registry errors and incomplete or inconsistent reports cannot pass', () => {
  assert.throws(() => unreviewedAdvisories({ ...report(), error: 'registry unavailable' }));
  assert.throws(() => unreviewedAdvisories({} as ReturnType<typeof report>));
  assert.throws(() => unreviewedAdvisories({ ...report(), advisories: {} }));
  assert.throws(() => unreviewedAdvisories({ ...report(), metadata: { vulnerabilities: { low: -1 } } }));
});
