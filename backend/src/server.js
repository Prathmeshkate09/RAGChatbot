require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (String(process.env.MEM_LOG || 'false').toLowerCase() === 'true') {
    setInterval(() => {
      const m = process.memoryUsage();
      const toMB = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';
      console.log(`[mem] rss=${toMB(m.rss)} heapTotal=${toMB(m.heapTotal)} heapUsed=${toMB(m.heapUsed)} ext=${toMB(m.external)}`);
    }, 10000);
  }
});
