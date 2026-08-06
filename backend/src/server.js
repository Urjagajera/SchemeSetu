// src/server.js
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[Server] Express backend listening on http://localhost:${PORT}`);
});
