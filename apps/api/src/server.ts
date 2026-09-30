import { app } from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Waypoint API server running on port ${PORT} [${config.env}]`);
  console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
});
