const { handle } = require('../shared/errors');
const svc = require('../application/shipmentService');
const { getDb } = require('../infrastructure/db');

module.exports = {
  GetShipment: handle((r) => svc.getShipment(r)),
  GetShipmentByOrder: handle((r) => svc.getShipmentByOrder(r)),
  UpdateShipmentStatus: handle((r) => svc.updateShipmentStatus(r)),
  Health: handle(async () => { await getDb().command({ ping: 1 }); return { status: 'UP' }; }),
};
