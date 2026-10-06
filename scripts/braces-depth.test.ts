import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

type Braces = ((input: string) => string[]) & {
  compile(input: unknown): string;
  expand(input: unknown): string[];
  stringify(input: unknown): string;
};

const load = createRequire(import.meta.url);
const fromTailwind = createRequire(load.resolve('tailwindcss'));
const fromFastGlob = createRequire(fromTailwind.resolve('fast-glob'));
const callers = [
  ['micromatch', fromFastGlob.resolve('micromatch')],
  ['chokidar', fromTailwind.resolve('chokidar')],
] as const;

callers.forEach(([caller, modulePath]) => {
  const braces = createRequire(modulePath)('braces') as Braces;

  test(`${caller} rejects deeply nested patterns before stack exhaustion`, () => {
    const pattern = `${'{'.repeat(4000)}x${'}'.repeat(4000)}`;
    assert.throws(() => braces(pattern), { name: 'SyntaxError', message: /exceeds max depth/ });
    assert.throws(() => braces.expand(pattern), { name: 'SyntaxError', message: /exceeds max depth/ });
  });

  test(`${caller} bounds direct AST traversal`, () => {
    ['compile', 'expand', 'stringify'].forEach((operation) => {
      let ast = { type: 'root', nodes: [] as unknown[] };
      for (let depth = 0; depth < 4000; depth += 1) {
        ast = { type: 'root', nodes: [ast] };
      }
      assert.throws(() => braces[operation as 'compile' | 'expand' | 'stringify'](ast), {
        name: 'RangeError',
        message: /exceeds max depth/,
      });
    });
  });

  test(`${caller} preserves ordinary brace compilation and expansion`, () => {
    assert.equal(braces.compile('src/{views,components}/**/*.{ts,vue}'), 'src/(views|components)/**/*.(ts|vue)');
    assert.deepEqual(braces.expand('page-{1..3}.vue'), ['page-1.vue', 'page-2.vue', 'page-3.vue']);
    assert.deepEqual(braces.expand('a{b,{c,{d,e}}}f'), ['abf', 'acf', 'adf', 'aef']);
    assert.deepEqual(braces.expand('a\\{b,c\\}'), ['a{b,c}']);
  });
});
