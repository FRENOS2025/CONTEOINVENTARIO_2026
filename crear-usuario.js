require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const [usuario, clave] = process.argv.slice(2);
  if (!usuario || !clave) {
    console.log('Uso: node crear-usuario.js USUARIO CLAVE');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL,
      creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const hash = await bcrypt.hash(clave, 10);
  await conn.query(
    'INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)',
    [usuario, hash]
  );

  console.log(`Usuario "${usuario}" creado`);
  await conn.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});