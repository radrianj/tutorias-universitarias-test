// ms-auth/src/app.js

const express = require('express');
const config = require('./config');
const authRouter = require('./api/routes/auth.routes'); // Importa el enrutador
const errorHandler = require('./api/middlewares/errorHandler');
// 1) Importar prom-client
const client = require('prom-client');

const app = express();

// 2) CONFIGURACIÓN PROMETHEUS
const register = new client.Registry();

// Métricas por defecto (CPU, memoria, etc.)
client.collectDefaultMetrics({ register });

// Métrica personalizada para contar peticiones HTTP
const httpRequestCounter = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total de solicitudes HTTP en ms-auth',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpRequestCounter);

// 3) Middleware para contar peticiones (antes de las rutas)
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

// 4) Endpoint /metrics (antes de /auth)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(express.json());

// Aquí se usa la variable 'authRouter'. Si el archivo importado no exporta
// una función, aquí es donde Express falla.
app.use('/auth', authRouter);

app.use(errorHandler);

app.listen(config.port, () => {
    console.log(`MS_Auth escuchando en el puerto ${config.port}`);
});