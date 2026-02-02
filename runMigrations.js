import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

const fallbackConfig = {
  user: 'sa',
  password: 'sa',
  server: 'localhost',
  database: process.env.DB_DATABASE || 'AccDBF',
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function runMigrations() {
  let pool;
  try {
    console.log('🔗 Connecting to database at', process.env.DB_SERVER, '...');
    try {
      pool = await sql.connect(config);
      console.log('✅ Connected to', process.env.DB_SERVER);
    } catch (err) {
      console.log('⚠️  Could not connect to', process.env.DB_SERVER, ':', err.message);
      console.log('   Trying localhost...');
      pool = await sql.connect(fallbackConfig);
      console.log('✅ Connected to localhost');
    }

    // Run all migrations in the migrations folder
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`\n📋 Found ${migrationFiles.length} migration(s):\n`);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`⏳ Running: ${file}`);
      try {
        await pool.request().query(sqlContent);
        console.log(`✅ ${file} completed\n`);
      } catch (error) {
        console.error(`❌ ${file} failed:`, error.message, '\n');
      }
    }

    console.log('🎉 All migrations completed!');
    await pool.close();
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
