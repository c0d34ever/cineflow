import { createConnection } from './db/index';
import { runMigrations } from './db/migrations/migrationRunner';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  try {
    console.log('🔄 Initializing database connection...');
    await createConnection();
    console.log('✅ Database connected');
    
    console.log('🔄 Running migrations...');
    await runMigrations();
    
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

