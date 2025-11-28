import { getPool } from './index';
import { runMigrations } from './migrations/migrationRunner';
import { seedDatabase } from './seeders/seederRunner';

export async function initDatabase(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Initializing database...');
    
    // Run migrations
    await runMigrations();
    
    // Seed database (if needed)
    const shouldSeed = process.env.SEED_DATABASE === 'true';
    if (shouldSeed) {
      await seedDatabase();
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

