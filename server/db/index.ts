import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

export async function createConnection(): Promise<void> {
  if (pool) {
    return;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cineflow',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 120000, // 120 seconds for initial connection (increased for remote DB)
  });

  // Test connection with retry logic
  let retries = 3;
  let lastError: any = null;
  
  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ MySQL connection established');
      connection.release();
      return;
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        console.log(`⚠️  MySQL connection attempt failed, retrying in 2 seconds... (${3 - retries}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error('❌ MySQL connection failed after 3 attempts:', lastError);
  throw lastError;
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createConnection() first.');
  }
  return pool;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

