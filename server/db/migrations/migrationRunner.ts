import { getPool } from '../index.js';
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
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📦 Found ${files.length} migration files`);

    // Get executed migrations
    const [executed] = await connection.query(
      'SELECT name FROM migrations'
    ) as [Array<{ name: string }>, any];
    const executedNames = new Set(executed.map(m => m.name));

    // Verify critical tables exist - if migrations are marked as executed but tables don't exist, re-run them
    if (executedNames.size > 0) {
      const [tables] = await connection.query(
        "SHOW TABLES"
      ) as [Array<{[key: string]: string}>, any];
      const tableNames = new Set(tables.map(t => Object.values(t)[0] as string));
      
      // Check if critical tables exist
      const criticalTables = ['projects', 'users', 'scenes'];
      const missingTables = criticalTables.filter(t => !tableNames.has(t));
      
      if (missingTables.length > 0) {
        console.log(`⚠️  Critical tables missing (${missingTables.join(', ')}), but migrations marked as executed.`);
        console.log(`🔄 Clearing migrations table to re-run migrations...`);
        await connection.query('DELETE FROM migrations');
        executedNames.clear(); // Clear the set so all migrations will run
      }
    }

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

      // Remove comments and split by semicolon
      const cleanedSql = sql
        .split('\n')
        .map(line => {
          // Remove full-line comments
          const commentIndex = line.indexOf('--');
          if (commentIndex >= 0) {
            return line.substring(0, commentIndex).trim();
          }
          return line.trim();
        })
        .filter(line => line.length > 0)
        .join('\n');

      // Split by semicolon and filter empty statements
      const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await connection.beginTransaction();

      try {
        for (const statement of statements) {
          if (statement.trim() && !statement.match(/^\s*$/)) {
            console.log(`  Executing: ${statement.substring(0, 50)}...`);
            try {
              await connection.query(statement);
            } catch (error: any) {
              // Handle specific errors that are safe to ignore
              if (error.code === 'ER_DUP_FIELDNAME' || 
                  error.code === 'ER_DUP_KEYNAME' || 
                  error.code === 'ER_DUP_ENTRY' ||
                  error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log(`  ⚠️  Warning: ${error.code} - ${error.message.substring(0, 100)}`);
                console.log(`  ⏭️  Skipping (likely already applied)`);
                // Continue execution - this is a non-fatal error
              } else {
                throw error; // Re-throw other errors
              }
            }
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
    const [migrations] = await connection.query(
      'SELECT name FROM migrations WHERE name = ?',
      [migrationName]
    ) as [Array<{ name: string }>, any];

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

