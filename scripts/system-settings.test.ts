import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { createPinia } from 'pinia';
import { mapSystemSettings, type SystemSettingsResource } from '../src/api/system/settings';
import { isValidBrandUrl, normalizeBrandUrl } from '../src/config/system-settings';

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
      navigation_logo_url: null,
      login_logo_url: null,
      login_background_url: null,
      favicon_url: null,
    })
  );

  assert.deepEqual(mapped.basic, {
    systemName: '',
    copyright: '',
    icpFilingNumber: '',
  });
});

test('branding URL settings map directly without resource state or IDs', () => {
  const mapped = mapSystemSettings(
    resource({
      navigation_logo_url: 'https://cdn.test/nav.png',
      login_logo_url: null,
      login_background_url: null,
      favicon_url: null,
    })
  );

  assert.deepEqual(mapped.brand, {
    navigationLogo: { url: 'https://cdn.test/nav.png' },
    loginLogo: { url: null },
    loginBackground: { url: null },
    favicon: { url: null },
  });
});

test('branding URLs allow null and empty values and normalize surrounding whitespace', () => {
  assert.equal(isValidBrandUrl(null), true);
  assert.equal(isValidBrandUrl(''), true);
  assert.equal(isValidBrandUrl('   '), true);
  assert.equal(normalizeBrandUrl('  https://cdn.test/logo.png  '), 'https://cdn.test/logo.png');
});

test('branding URLs require HTTP(S), exclude credentials, and enforce the 2048 character limit', () => {
  assert.equal(isValidBrandUrl('http://cdn.test/logo.png'), true);
  assert.equal(isValidBrandUrl('https://cdn.test/logo.png'), true);
  assert.equal(isValidBrandUrl('ftp://cdn.test/logo.png'), false);
  assert.equal(isValidBrandUrl('https://user:secret@cdn.test/logo.png'), false);
  assert.equal(isValidBrandUrl('https://cdn.test'), true);
  assert.equal(isValidBrandUrl(`https://cdn.test/${'a'.repeat(2031)}`), true);
  assert.equal(isValidBrandUrl(`https://cdn.test/${'a'.repeat(2032)}`), false);
});

test('an admin resource invalidates an older public request generation', async () => {
  const { default: useSystemSettingsStore } = await import('../src/store/modules/system-settings');
  const store = useSystemSettingsStore(createPinia());
  store.status = 'loading';
  store.requestId = 4;
  const publicRequestId = store.requestId;

  store.applyResource(
    resource({
      navigation_logo_url: 'https://cdn.test/new-nav.png',
      login_logo_url: null,
      login_background_url: null,
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
  assert.ok(saveBrand.indexOf('brandSaving.value = true') < saveBrand.indexOf('await brandFormRef.value?.validate()'));
  assert.ok(
    saveBrand.indexOf('await brandFormRef.value?.validate()') < saveBrand.indexOf('await updateBrandingSystemSettings')
  );
  assert.match(saveBrand, /navigation_logo_url: normalizeBrandUrl\(brandForm\.navigationLogo\.url\)/);
  assert.match(saveBrand, /login_logo_url: normalizeBrandUrl\(brandForm\.loginLogo\.url\)/);
  assert.match(saveBrand, /login_background_url: normalizeBrandUrl\(brandForm\.loginBackground\.url\)/);
  assert.match(saveBrand, /favicon_url: normalizeBrandUrl\(brandForm\.favicon\.url\)/);
  assert.doesNotMatch(saveBrand, /navigation_logo_path/);
});

test('brand editor accepts direct URLs without File API coupling', () => {
  assert.match(settingsPageSource, /ref="brandFormRef"/);
  assert.match(settingsPageSource, /:rules="brandRules"/);
  assert.match(brandAssetFieldSource, /:model-value="asset\.url \?\? ''"/);
  assert.match(brandAssetFieldSource, /:max-length="2048"/);
  assert.doesNotMatch(brandAssetFieldSource, /AFilePicker|FileItem|asset\.path/);
});

test('dynamic favicons do not retain the built-in SVG MIME hint', () => {
  assert.match(appSource, /favicon\.removeAttribute\('type'\)/);
  assert.ok(appSource.indexOf("favicon.removeAttribute('type')") < appSource.indexOf('favicon.href = source'));
});
