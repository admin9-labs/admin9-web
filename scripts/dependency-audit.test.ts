import assert from 'node:assert/strict';
import test from 'node:test';
import unreviewedAdvisories from './dependency-audit';

function report(overrides = {}) {
  return {
    advisories: {
      '1': {
        github_advisory_id: 'GHSA-vrm6-8vpv-qv8q',
        module_name: 'undici',
        severity: 'high',
        findings: [{ version: '5.29.0', paths: ['.>openapi-typescript>undici'] }],
        ...overrides,
      },
    },
    metadata: { vulnerabilities: { high: 1, critical: 0 } },
  };
}

test('only the reviewed WebSocket advisories in the pinned generator are exempt', () => {
  ['GHSA-vrm6-8vpv-qv8q', 'GHSA-v9p9-hfj2-hcw8', 'GHSA-vxpw-j846-p89q'].forEach((id) => {
    assert.deepEqual(unreviewedAdvisories(report({ github_advisory_id: id }), '6.7.6'), []);
  });
  assert.equal(unreviewedAdvisories(report({ github_advisory_id: 'GHSA-new-advisory' }), '6.7.6').length, 1);
  assert.equal(unreviewedAdvisories(report({ severity: 'critical' }), '6.7.6').length, 1);
  assert.equal(unreviewedAdvisories(report(), '7.0.0').length, 1);
});

test('new consumers, versions, and missing path evidence require review', () => {
  [
    [],
    [{ version: '5.29.0', paths: [] }],
    [{ version: '5.28.4', paths: ['.>openapi-typescript>undici'] }],
    [{ version: '5.29.0', paths: ['.>openapi-typescript>undici', '.>runtime-client>undici'] }],
  ].forEach((findings) => {
    assert.equal(unreviewedAdvisories(report({ findings }), '6.7.6').length, 1);
  });
});

test('a registry error cannot masquerade as an audit without vulnerabilities', () => {
  assert.throws(() => unreviewedAdvisories({ ...report(), error: 'registry unavailable' }, '6.7.6'));
  assert.throws(() => unreviewedAdvisories({} as ReturnType<typeof report>, '6.7.6'));
  assert.throws(() => unreviewedAdvisories({ ...report(), advisories: {} }, '6.7.6'));
});
