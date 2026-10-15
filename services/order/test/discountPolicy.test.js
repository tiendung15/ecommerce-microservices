const test = require('node:test');
const assert = require('node:assert');
const { calculateDiscount, discountRate, parseTiers } = require('../src/domain/discountPolicy');

const tiers = parseTiers('0:0,100:5,500:10,1000:15');

test('discountRate chọn đúng mốc score', () => {
  assert.strictEqual(discountRate(0, tiers), 0);
  assert.strictEqual(discountRate(99, tiers), 0);
  assert.strictEqual(discountRate(100, tiers), 5);
  assert.strictEqual(discountRate(500, tiers), 10);
  assert.strictEqual(discountRate(5000, tiers), 15);
});

test('calculateDiscount trả số tiền giảm, làm tròn 2 chữ số', () => {
  assert.strictEqual(calculateDiscount(200, 500, tiers), 20);
  assert.strictEqual(calculateDiscount(33.33, 100, tiers), 1.67);
  assert.strictEqual(calculateDiscount(1000, 0, tiers), 0);
});
