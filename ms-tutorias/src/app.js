// ms-tutorias/src/app.js

const express = require('express');
const config = require('./config'); // Importamos nuestra configuración centralizada
const tutoriasRouter = require('./api/routes/tutorias.routes');
const errorHandler = require('./api/middlewares/errorHandler'); // El manejador de errores reutilizable
const correlationIdMiddleware = require('./api/middlewares/correlationId.middleware.js');
// Importamos la librería prom-client para métricas Prometheus
const client = require('prom-client');

const app = express();

// Configuración de métricas Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'tutorias_http_requests_total',
  help: 'Total de solicitudes HTTP en ms-tutorias',
  labelNames: ['method', 'route', 'status'],
});
register.registerMetric(httpRequestCounter);

// Middleware para contar peticiones (antes de las rutas)
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode,
    });
  });
  next();
});


// Middlewares esenciales
app.use(express.json()); // Permite al servidor entender y procesar bodies en formato JSON
app.use(correlationIdMiddleware); // Añadimos el middleware de correlationIdMiddleware

// Enrutamiento principal
// Cualquier petición a "/tutorias" será gestionada por nuestro router.
app.use('/tutorias', tutoriasRouter);

// Middleware de manejo de errores
// Debe ser el ÚLTIMO middleware que se añade.
app.use(errorHandler);

// Endpoint para métricas Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Iniciar el servidor
app.listen(config.port, () => {
    console.log(`MS_Tutorias (Orquestador) escuchando en el puerto ${config.port}`);
});