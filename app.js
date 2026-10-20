const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Conteo de inventario 2026 - funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});