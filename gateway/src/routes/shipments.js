const router = require('express').Router();
const { rpc } = require('../grpcClients');
const authorize = require('../middleware/authorize');
const { wrap, HttpError } = require('../httpError');
const { intParam, bodyObject } = require('../validate');

const dto = (s) => ({ shipid: s.shipid, oid: s.oid, status: s.status });

// API-SHP-01: khách chỉ xem Shipment của đơn mình (kiểm tra trong Shipment Service)
router.get('/:shipid', wrap(async (req, res) => {
  const shipid = intParam(req.params.shipid, 'shipid');
  res.json(dto(await rpc('shipment', 'GetShipment', { shipid, requester_uid: req.user.uid, requester_role: req.user.role })));
}));

// API-SHP-02: chỉ Shipment Staff / Admin
router.patch('/:shipid/status', authorize('SHIPMENT_STAFF', 'ADMIN'), wrap(async (req, res) => {
  const shipid = intParam(req.params.shipid, 'shipid');
  const b = bodyObject(req);
  if (typeof b.status !== 'string') throw new HttpError(400, 'status must be a string');
  res.json(dto(await rpc('shipment', 'UpdateShipmentStatus', { shipid, status: b.status })));
}));

module.exports = router;
