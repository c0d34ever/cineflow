import { getPool } from './index.js';
import { runMigrations } from './migrations/migrationRunner.js';
import { seedDatabase } from './seeders/seederRunner.js';

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
      try {
        await seedDatabase();
      } catch (error) {
        console.warn('⚠️  Seeding failed, but continuing server startup:', error);
        // Don't throw - allow server to start even if seeding fails
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

