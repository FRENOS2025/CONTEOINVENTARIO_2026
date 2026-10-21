require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const pool = mysql.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(process.env.INSTANCE_CONNECTION_NAME
    ? { socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` }
    : { host: process.env.DB_HOST, port: process.env.DB_PORT }),
});

// ---------- Autenticación ----------
function requireAuth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    next();
  } catch {
    res.redirect('/login');
  }
}

app.get('/login', (req, res) => {
  const aviso = req.query.error ? '<p style="color:red">Usuario o clave incorrectos</p>' : '';
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ingresar</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; margin-top: 80px; }
        form { display: flex; flex-direction: column; gap: 12px; width: 280px; }
        input, button { padding: 10px; font-size: 16px; }
      </style>
    </head>
    <body>
      <form method="POST" action="/login">
        <h2>Conteo de inventario</h2>
        ${aviso}
        <input name="usuario" placeholder="Usuario" required autofocus>
        <input name="clave" type="password" placeholder="Clave" required>
        <button type="submit">Ingresar</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/login', async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    const [rows] = await pool.query(
      'SELECT id, usuario, password_hash FROM usuarios WHERE usuario = ?',
      [usuario]
    );
    const ok = rows.length && (await bcrypt.compare(clave, rows[0].password_hash));
    if (!ok) return res.redirect('/login?error=1');

    const token = jwt.sign(
      { id: rows[0].id, usuario: rows[0].usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error del servidor');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ---------- Rutas protegidas ----------
app.get('/', requireAuth, (req, res) => {
  res.send(`Conteo de inventario 2026 - Hola ${req.user.usuario} | <a href="/logout">Salir</a>`);
});

app.get('/db-test', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS ahora');
    res.json({ conectado: true, hora_servidor: rows[0].ahora });
  } catch (err) {
    console.error(err);
    res.status(500).json({ conectado: false, error: err.message });
  }
});

app.get('/tablas', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});