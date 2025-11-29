// ms-agenda/src/app.js
const express = require('express');
const config = require('./config'); // <-- USAR EL NUEVO CONFIG
const agendaRouter = require('./api/routes/agenda.routes');
const errorHandler = require('./api/middlewares/errorHandler');
const correlationIdMiddleware = require('./api/middlewares/correlationId.middleware.js');
const messageProducer = require('./infrastructure/messaging/message.producer'); // <-- IMPORTAR PRODUCTOR
// Importamos la librería prom-client para métricas Prometheus
const client = require('prom-client');

const app = express();

// ===== CONFIGURACIÓN PROMETHEUS =====
const register = new client.Registry();

// Métricas por defecto (CPU, memoria, etc.)
client.collectDefaultMetrics({ register });

// Métrica personalizada para contar peticiones HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de solicitudes HTTP en ms-agenda',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpRequestCounter);

// Middleware para contar peticiones
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

// Endpoint de métricas para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/agenda', agendaRouter);
app.use(errorHandler);

app.listen(config.port, () => { // <-- Usar config.port
    console.log(`MS_Agenda escuchando en el puerto ${config.port}`);
    messageProducer.connect(); // <-- INICIAR CONEXIÓN A RABBITMQ
});