import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { products } from '../lib/products.ts';

test('both projects provide real, locally served screen samples with accessible descriptions', async()=>{
  for(const product of products){
    assert.ok(product.media?.length>=2, `${product.name} has visual evidence`);
    for(const media of product.media){
      assert.ok(media.src.startsWith('/images/projects/'));
      assert.ok(media.alt.includes(product.name));
      const bytes=await readFile(new URL('../public'+media.src,import.meta.url));
      assert.ok(bytes.readUInt32BE(0)===0x89504e47 || bytes.readUInt16BE(0)===0xffd8, 'valid PNG or JPEG source screenshot');
      assert.ok(bytes.length>2000);
    }
  }
});

test('the two featured products lead directly to their published experiences', () => {
  assert.deepEqual(products.map(product => product.slug), ['pop-reminder', 'idea-boost']);
  assert.deepEqual(products.map(product => product.primaryLink.href), [
    'https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja',
    'https://ideaboost.dev/',
  ]);
  assert.equal(products[1].team, 'チーム開発');
});

test('product introductions state the core use and link to both public repositories', () => {
  assert.deepEqual(products.map(product => [product.summary, product.sourceLink?.href]), [
    ['数秒話すだけで、思いついた用事を残せるリマインダー。', 'https://github.com/rion0918/fuwatto'],
    ['使う人が本当に欲しいものを、誰でも迷わず考えられるアイデアボード。', 'https://github.com/engineer-first/idea-boost'],
  ]);
});
