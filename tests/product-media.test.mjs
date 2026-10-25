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
