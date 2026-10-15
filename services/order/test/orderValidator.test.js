const test = require('node:test');
const assert = require('node:assert');
const { normalizeItems } = require('../src/domain/orderValidator');

test('gộp pid trùng', () => {
  assert.deepStrictEqual(normalizeItems([{ pid: 1, qty: 2 }, { pid: 1, qty: 3 }, { pid: 2, qty: 1 }]),
    [{ pid: 1, qty: 5 }, { pid: 2, qty: 1 }]);
});
test('từ chối items rỗng / qty <= 0 / pid sai', () => {
  assert.throws(() => normalizeItems([]));
  assert.throws(() => normalizeItems([{ pid: 1, qty: 0 }]));
  assert.throws(() => normalizeItems([{ pid: 0, qty: 1 }]));
  assert.throws(() => normalizeItems(undefined));
});
