import { getPool } from '../index';
import bcrypt from 'bcryptjs';

const pool = getPool();

export async function seedDatabase(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Seed admin user
    await seedAdminUser(connection);

    // Seed sample projects (optional)
    // await seedSampleProjects(connection);

    await connection.commit();
    console.log('✅ Database seeded successfully');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function seedAdminUser(connection: any): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cineflow.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  // Check if admin already exists
  const [existing] = await connection.query(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [adminEmail, adminUsername]
  );

  if (existing.length > 0) {
    console.log('⏭️  Admin user already exists, skipping...');
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  await connection.query(
    `INSERT INTO users (username, email, password_hash, role, is_active) 
     VALUES (?, ?, ?, 'admin', TRUE)`,
    [adminUsername, adminEmail, passwordHash]
  );

  console.log(`✅ Admin user created:
    Username: ${adminUsername}
    Email: ${adminEmail}
    Password: ${adminPassword}
    ⚠️  Please change the default password!`);
}

async function seedSampleProjects(connection: any): Promise<void> {
  // Optional: Add sample projects for testing
  const sampleProject = {
    id: 'sample-' + Date.now(),
    title: 'Sample Project',
    genre: 'Sci-Fi',
    plotSummary: 'A sample project for testing',
    characters: 'Hero, Villain',
    initialContext: '',
    lastUpdated: Date.now(),
  };

  await connection.query(
    `INSERT INTO projects (id, title, genre, plot_summary, characters, initial_context, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sampleProject.id,
      sampleProject.title,
      sampleProject.genre,
      sampleProject.plotSummary,
      sampleProject.characters,
      sampleProject.initialContext,
      sampleProject.lastUpdated,
    ]
  );

  console.log('✅ Sample project created');
}

