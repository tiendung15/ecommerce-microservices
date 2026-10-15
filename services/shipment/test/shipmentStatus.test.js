const test = require('node:test');
const assert = require('node:assert');
const { validateStatus, parseOrderCreated } = require('../src/domain/shipmentStatus');

test('status hợp lệ / không hợp lệ', () => {
  assert.strictEqual(validateStatus('SHIPPING'), 'SHIPPING');
  assert.throws(() => validateStatus('FLYING'));
  assert.throws(() => validateStatus(undefined));
});

test('TC-SHP-02: event thiếu oid bị từ chối', () => {
  assert.ok(parseOrderCreated(JSON.stringify({ uid: 1 })).error);
  assert.ok(parseOrderCreated('not json').error);
});

test('event hợp lệ được parse', () => {
  assert.deepStrictEqual(parseOrderCreated(JSON.stringify({ oid: 5, uid: 2, x: 1 })), { oid: 5, uid: 2 });
});
