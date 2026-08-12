import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { createPinia } from 'pinia';
import type { components } from '../src/api/generated/admin-api';
import { mapSystemSettings, type MediaSetting, type SystemSettingsResource } from '../src/api/system/settings';

const require = createRequire(import.meta.url);
const loadAssetPath = (module: NodeModule, filename: string) => {
  module.exports = filename;
};
require.extensions['.svg'] = loadAssetPath;
require.extensions['.png'] = loadAssetPath;

type MediaResource = components['schemas']['MediaResource'];
const settingsPageSource = readFileSync(resolve(process.cwd(), 'src/views/system/configs/index.vue'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8');

const media = (id: number, url: string | null): MediaResource => ({
  id,
  name: `media-${id}`,
  type: 'image',
  extension: 'png',
  mime_type: 'image/png',
  size: 1024,
  width: 100,
  height: 100,
  status: 'ready',
  url,
  created_at: '2026-08-12T00:00:00Z',
});

const setting = (value: Partial<MediaSetting>): MediaSetting => ({
  media_id: null,
  state: 'empty',
  media: null,
  ...value,
});

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
      navigation_logo: setting({}),
      login_logo: setting({}),
      login_background: setting({}),
      favicon: setting({}),
    })
  );

  assert.deepEqual(mapped.basic, {
    systemName: '',
    copyright: '',
    icpFilingNumber: '',
  });
});

test('media settings keep ready IDs and clear invalid selections before they can be saved again', () => {
  const mapped = mapSystemSettings(
    resource({
      navigation_logo: setting({ media_id: 11, state: 'ready', media: media(11, 'https://cdn.test/nav.png') }),
      login_logo: setting({ media_id: 12, state: 'invalid' }),
      login_background: setting({}),
      favicon: setting({ media_id: 13, state: 'ready', media: media(13, null) }),
    })
  );

  assert.deepEqual(mapped.brand, {
    navigationLogo: { id: 11, url: 'https://cdn.test/nav.png' },
    loginLogo: { id: null, url: null },
    loginBackground: { id: null, url: null },
    favicon: { id: 13, url: null },
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
      navigation_logo: setting({ media_id: 21, state: 'ready', media: media(21, 'https://cdn.test/new-nav.png') }),
      login_logo: setting({}),
      login_background: setting({}),
      favicon: setting({}),
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
});

test('dynamic favicons do not retain the built-in SVG MIME hint', () => {
  assert.match(appSource, /favicon\.removeAttribute\('type'\)/);
  assert.ok(appSource.indexOf("favicon.removeAttribute('type')") < appSource.indexOf('favicon.href = source'));
});
