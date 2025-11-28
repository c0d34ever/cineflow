import { getPool } from './index';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  name: string;
  content: string;
}

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Ensure migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📦 Found ${files.length} migration files`);

    // Get executed migrations
    const [executed] = await connection.query<Array<{ name: string }>>(
      'SELECT name FROM migrations'
    );
    const executedNames = new Set(executed.map(m => m.name));

    // Run pending migrations
    for (const file of files) {
      const migrationName = file.replace('.sql', '');
      
      if (executedNames.has(migrationName)) {
        console.log(`⏭️  Skipping already executed: ${migrationName}`);
        continue;
      }

      console.log(`🔄 Running migration: ${migrationName}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      await connection.beginTransaction();

      try {
        for (const statement of statements) {
          if (statement.trim()) {
            await connection.query(statement);
          }
        }

        // Record migration
        await connection.query(
          'INSERT INTO migrations (name) VALUES (?)',
          [migrationName]
        );

        await connection.commit();
        console.log(`✅ Migration completed: ${migrationName}`);
      } catch (error) {
        await connection.rollback();
        console.error(`❌ Migration failed: ${migrationName}`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function rollbackMigration(migrationName: string): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [migrations] = await connection.query<Array<{ name: string }>>(
      'SELECT name FROM migrations WHERE name = ?',
      [migrationName]
    );

    if (migrations.length === 0) {
      throw new Error(`Migration ${migrationName} not found`);
    }

    // Note: Actual rollback SQL would need to be defined separately
    // For now, just remove from migrations table
    await connection.query(
      'DELETE FROM migrations WHERE name = ?',
      [migrationName]
    );

    console.log(`✅ Rolled back migration: ${migrationName}`);
  } catch (error) {
    console.error(`❌ Rollback failed: ${migrationName}`, error);
    throw error;
  } finally {
    connection.release();
  }
}

