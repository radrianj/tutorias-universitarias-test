// ms-usuarios/src/app.js
const express = require('express');
const config = require('./config'); // <-- USAR EL NUEVO CONFIG
const usuariosRouter = require('./api/routes/usuarios.routes');
const errorHandler = require('./api/middlewares/errorHandler');
const correlationIdMiddleware = require('./api/middlewares/correlationId.middleware.js');
const messageProducer = require('./infrastructure/messaging/message.producer'); // <-- IMPORTAR PRODUCTOR
// NUEVO: métricas Prometheus
const client = require('prom-client');

const app = express();

// ===== CONFIGURACIÓN PROMETHEUS =====
const register = new client.Registry();

// Métricas por defecto (CPU, memoria, etc.)
client.collectDefaultMetrics({ register });

// Métrica personalizada para peticiones HTTP
const httpRequestCounter = new client.Counter({
  name: 'usuarios_http_requests_total',
  help: 'Total de solicitudes HTTP en ms-usuarios',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpRequestCounter);

// Middleware para contar peticiones (antes de las rutas)
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode
    });
  });
  next();
});

// Endpoint /metrics (antes de /usuarios)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(express.json());
app.use(correlationIdMiddleware);

app.use('/usuarios', usuariosRouter);

app.use(errorHandler);

app.listen(config.port, () => { // <-- Usar config.port
    console.log(`MS_Usuarios escuchando en el puerto ${config.port}`);
    messageProducer.connect(); // <-- INICIAR CONEXIÓN A RABBITMQ
});