#!/usr/bin/env node
/**
 * Exporte la base de données MySQL vers base.sql à la racine du projet.
 * Utilise les variables d'environnement du fichier .env (DATABASE_URL).
 * Usage: node scripts/export-db.js
 * Ou: npm run db:export
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseDatabaseUrl(url) {
  const match = url.match(/mysql:\/\/([^:]*):([^@]*)@([^:]+):(\d+)\/([^?]*)/);
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return { user, password, host, port: parseInt(port, 10), database };
}

async function getCreateTable(conn, tableName) {
  const [rows] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
  return rows[0]['Create Table'] + ';\n';
}

async function getTableData(conn, tableName) {
  const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
  if (rows.length === 0) return '';

  const [columns] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
  const colNames = columns.map(c => c.Field);

  let sql = `\n-- Data for table ${tableName}\n`;
  for (const row of rows) {
    const values = colNames.map(col => {
      const v = row[col];
      if (v === null) return 'NULL';
      if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
    });
    sql += `INSERT INTO \`${tableName}\` (\`${colNames.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
  }
  return sql;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL non définie dans .env');
    process.exit(1);
  }

  const config = parseDatabaseUrl(url);
  if (!config) {
    console.error('DATABASE_URL invalide. Format attendu: mysql://user:password@host:port/database');
    process.exit(1);
  }

  const outPath = path.join(__dirname, '..', 'base.sql');
  let output = '';

  output += `-- Export de la base de données ${config.database}\n`;
  output += `-- Généré le ${new Date().toISOString()}\n`;
  output += `-- Ne pas modifier à la main.\n\n`;
  output += `SET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n`;

  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || undefined,
      database: config.database,
      multipleStatements: true,
    });
  } catch (err) {
    console.error('Impossible de se connecter à MySQL:', err.message);
    process.exit(1);
  }

  try {
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [config.database]
    );

    for (const { TABLE_NAME: table } of tables) {
      output += `\n-- Table: ${table}\n`;
      output += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      output += await getCreateTable(conn, table);
      output += await getTableData(conn, table);
    }

    output += '\nSET FOREIGN_KEY_CHECKS=1;\n';
    fs.writeFileSync(outPath, output, 'utf8');
    console.log('Export terminé:', outPath);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
