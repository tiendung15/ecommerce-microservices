const express = require('express');
const morgan = require('morgan');
const config = require('./config');
const rateLimit = require('./middleware/rateLimit');
const authenticate = require('./middleware/auth');
const { toHttp } = require('./httpError');

const app = express();
app.disable('x-powered-by');

// Logging: ghi method, url, status, thời gian xử lý, uid (nếu đã xác thực)
morgan.token('uid', (req) => (req.user ? req.user.uid : '-'));
app.use(morgan(':date[iso] :remote-addr :method :url :status :response-time ms uid=:uid'));

// Rate limiting (Redis)
app.use(rateLimit);
app.use(express.json({ limit: '100kb' }));

// Route công khai
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));

// Route cần đăng nhập: xác thực JWT một lần ở đây, phân quyền theo role nằm trong từng route
app.use('/api/customers', authenticate, require('./routes/customers'));
app.use('/api/products', authenticate, require('./routes/products').router);
app.use('/api/orders', authenticate, require('./routes/orders'));
app.use('/api/shipments', authenticate, require('./routes/shipments'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
  const { status, message } = toHttp(err);
  if (status >= 500) console.error('[gateway] error:', err);
  res.status(status).json({ message });
});

app.listen(config.port, () => console.log(`[gateway] listening on :${config.port}`));
