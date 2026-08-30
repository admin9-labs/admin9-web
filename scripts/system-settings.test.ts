import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { createPinia } from 'pinia';
import { mapSystemSettings, type SystemSettingsResource } from '../src/api/system/settings';

const require = createRequire(import.meta.url);
const loadAssetPath = (module: NodeModule, filename: string) => {
  module.exports = filename;
};
require.extensions['.svg'] = loadAssetPath;
require.extensions['.png'] = loadAssetPath;

const settingsPageSource = readFileSync(resolve(process.cwd(), 'src/views/system/configs/index.vue'), 'utf8');
const brandAssetFieldSource = readFileSync(
  resolve(process.cwd(), 'src/views/system/configs/components/BrandAssetField.vue'),
  'utf8'
);
const appSource = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8');

const resource = (branding: SystemSettingsResource['branding']): SystemSettingsResource => ({
  basic: {
    system_name: null,
    copyright: null,
    icp_filing_number: null,
  },
  branding,
});

test('nullable basic settings map to empty form values', () => {
  const mapped = mapSystemSettings(
    resource({
      navigation_logo_path: null,
      navigation_logo_url: null,
      login_logo_path: null,
      login_logo_url: null,
      login_background_path: null,
      login_background_url: null,
      favicon_path: null,
      favicon_url: null,
    })
  );

  assert.deepEqual(mapped.basic, {
    systemName: '',
    copyright: '',
    icpFilingNumber: '',
  });
});

test('branding file paths and derived URLs map without File IDs', () => {
  const mapped = mapSystemSettings(
    resource({
      navigation_logo_path: 'files/2026/08/nav.png',
      navigation_logo_url: 'https://cdn.test/nav.png',
      login_logo_path: null,
      login_logo_url: null,
      login_background_path: 'files/2026/08/missing.png',
      login_background_url: null,
      favicon_path: null,
      favicon_url: null,
    })
  );

  assert.deepEqual(mapped.brand, {
    navigationLogo: { path: 'files/2026/08/nav.png', url: 'https://cdn.test/nav.png' },
    loginLogo: { path: null, url: null },
    loginBackground: { path: 'files/2026/08/missing.png', url: null },
    favicon: { path: null, url: null },
  });
});

test('an admin resource invalidates an older public request generation', async () => {
  const { default: useSystemSettingsStore } = await import('../src/store/modules/system-settings');
  const store = useSystemSettingsStore(createPinia());
  store.status = 'loading';
  store.requestId = 4;
  const publicRequestId = store.requestId;

  store.applyResource(
    resource({
      navigation_logo_path: 'files/2026/08/new-nav.png',
      navigation_logo_url: 'https://cdn.test/new-nav.png',
      login_logo_path: null,
      login_logo_url: null,
      login_background_path: null,
      login_background_url: null,
      favicon_path: null,
      favicon_url: null,
    })
  );

  assert.equal(store.requestId, 5);
  assert.notEqual(publicRequestId, store.requestId);
  assert.equal(store.status, 'ready');
  assert.equal(store.systemName, 'Admin9 Pro');
  assert.equal(store.navigationLogoUrl, 'https://cdn.test/new-nav.png');
});

test('the settings editor stays locked until the admin resource loads', () => {
  assert.match(settingsPageSource, /const settingsLoaded = ref\(false\)/);
  assert.match(settingsPageSource, /canUpdate\.value && settingsLoaded\.value/);
  assert.equal((settingsPageSource.match(/:disabled="!canEdit"/g) ?? []).length, 3);
  assert.equal((settingsPageSource.match(/:readonly="!canEdit"/g) ?? []).length, 4);
  assert.equal((settingsPageSource.match(/if \(!canEdit\.value\) return;/g) ?? []).length, 2);
});

test('every full settings response refreshes both forms and snapshots', () => {
  const applyResource = settingsPageSource.match(
    /const applySettingsResource = \(resource: SystemSettingsResource\) => \{([\s\S]*?)\n[ ]{2}\};/
  )?.[1];

  assert.ok(applyResource);
  assert.match(applyResource, /Object\.assign\(basicForm,/);
  assert.match(applyResource, /Object\.assign\(brandForm,/);
  assert.match(applyResource, /basicSnapshot\.value = JSON\.stringify\(basicForm\)/);
  assert.match(applyResource, /brandSnapshot\.value = JSON\.stringify\(brandForm\)/);
  assert.equal((settingsPageSource.match(/applySettingsResource\(response\.data\)/g) ?? []).length, 3);
});

test('save handlers acquire their lock before the first asynchronous operation', () => {
  const saveBasic = settingsPageSource.match(/const saveBasic = async \(\) => \{([\s\S]*?)\n[ ]{2}\};/)?.[1];
  const saveBrand = settingsPageSource.match(/const saveBrand = async \(\) => \{([\s\S]*?)\n[ ]{2}\};/)?.[1];

  assert.ok(saveBasic);
  assert.ok(saveBrand);
  assert.ok(saveBasic.indexOf('basicSaving.value = true') < saveBasic.indexOf('await basicFormRef.value?.validate()'));
  assert.ok(saveBrand.indexOf('brandSaving.value = true') < saveBrand.indexOf('await updateBrandingSystemSettings'));
  assert.match(saveBrand, /navigation_logo_path: brandForm\.navigationLogo\.path/);
  assert.doesNotMatch(saveBrand, /navigation_logo_url/);
});

test('brand file picker is an unbound replacement command that resets after selection', () => {
  assert.match(brandAssetFieldSource, /<AFilePicker/);
  assert.doesNotMatch(brandAssetFieldSource, /model-value/);
  assert.match(brandAssetFieldSource, /#trigger="\{ open \}"/);
  assert.match(brandAssetFieldSource, /@click="open"/);
  assert.match(brandAssetFieldSource, /item\?\.path/);
  assert.match(brandAssetFieldSource, /pickerKey\.value \+= 1/);
  assert.match(brandAssetFieldSource, /asset\.path && !asset\.url/);
});

test('dynamic favicons do not retain the built-in SVG MIME hint', () => {
  assert.match(appSource, /favicon\.removeAttribute\('type'\)/);
  assert.ok(appSource.indexOf("favicon.removeAttribute('type')") < appSource.indexOf('favicon.href = source'));
});
