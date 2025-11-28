import { getPool } from '../index';
import bcrypt from 'bcryptjs';

export async function seedDatabase(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Check if users table exists before seeding
    const [tables] = await connection.query<Array<{Tables_in_youtigyk_cineflow: string}>>(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length === 0) {
      console.log('⏭️  Users table does not exist, skipping seed. Run migrations first.');
      return;
    }

    await connection.beginTransaction();

    // Seed admin user
    await seedAdminUser(connection);

    // Seed system templates
    await seedSystemTemplates(connection);

    // Seed sample projects (optional)
    // await seedSampleProjects(connection);

    await connection.commit();
    console.log('✅ Database seeded successfully');
  } catch (error: any) {
    await connection.rollback();
    // Don't throw error if table doesn't exist - just log it
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.log('⏭️  Required tables do not exist, skipping seed. Run migrations first.');
      return;
    }
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

async function seedSystemTemplates(connection: any): Promise<void> {
  // Check if templates table exists
  const [tables] = await connection.query<Array<{Tables_in_youtigyk_cineflow: string}>>(
    "SHOW TABLES LIKE 'project_templates'"
  );
  
  if (tables.length === 0) {
    return; // Table doesn't exist yet
  }

  // Check if templates already exist
  const [existing] = await connection.query(
    'SELECT COUNT(*) as count FROM project_templates WHERE is_system_template = TRUE'
  );
  
  if ((existing as any[])[0].count > 0) {
    console.log('⏭️  System templates already exist, skipping...');
    return;
  }

  const templates = [
    {
      name: 'Action Thriller',
      description: 'Fast-paced action with intense sequences',
      genre: 'Action',
      plot_summary: 'A high-stakes thriller with dynamic action sequences, chase scenes, and intense confrontations.',
      characters: 'Protagonist (skilled fighter), Antagonist (powerful enemy), Supporting characters',
      initial_context: 'Opening scene sets the tone with high energy and immediate conflict.',
      director_settings: JSON.stringify({
        lens: '24mm Wide',
        angle: 'Dynamic',
        lighting: 'High Contrast',
        movement: 'Handheld/Steadicam',
        style: 'Cinematic',
        transition: 'Quick Cut'
      })
    },
    {
      name: 'Drama',
      description: 'Character-driven emotional storytelling',
      genre: 'Drama',
      plot_summary: 'An intimate character study exploring relationships, emotions, and human experiences.',
      characters: 'Main character (complex), Supporting characters (relationships)',
      initial_context: 'Quiet, contemplative opening establishing character and mood.',
      director_settings: JSON.stringify({
        lens: '50mm Prime',
        angle: 'Eye Level',
        lighting: 'Natural Soft',
        movement: 'Static/Slow Push',
        style: 'Cinematic',
        transition: 'Fade'
      })
    },
    {
      name: 'Sci-Fi',
      description: 'Futuristic settings with advanced technology',
      genre: 'Sci-Fi',
      plot_summary: 'A science fiction narrative exploring technology, space, time, or alternate realities.',
      characters: 'Scientist/Explorer, AI/Android, Alien/Otherworldly beings',
      initial_context: 'Establishing shot of futuristic world or technology.',
      director_settings: JSON.stringify({
        lens: '35mm Prime',
        angle: 'Wide Establishing',
        lighting: 'Cool/Cyberpunk',
        movement: 'Slow Push/Pan',
        style: 'Cinematic',
        transition: 'Dissolve'
      })
    },
    {
      name: 'Comedy',
      description: 'Light-hearted and humorous storytelling',
      genre: 'Comedy',
      plot_summary: 'A comedic narrative with witty dialogue, situational humor, and entertaining characters.',
      characters: 'Comic protagonist, Supporting comedic characters',
      initial_context: 'Fun, upbeat opening that establishes the comedic tone.',
      director_settings: JSON.stringify({
        lens: '28mm Wide',
        angle: 'Eye Level',
        lighting: 'Bright Natural',
        movement: 'Static/Handheld',
        style: 'Cinematic',
        transition: 'Cut'
      })
    },
    {
      name: 'Horror',
      description: 'Suspenseful and atmospheric horror',
      genre: 'Horror',
      plot_summary: 'A chilling narrative building tension, fear, and suspense through atmosphere and pacing.',
      characters: 'Victim/Protagonist, Antagonist (monster/entity), Supporting characters',
      initial_context: 'Eerie, atmospheric opening establishing the horror tone.',
      director_settings: JSON.stringify({
        lens: '35mm Prime',
        angle: 'Low Angle',
        lighting: 'Dark/Shadowy',
        movement: 'Slow Creep',
        style: 'Cinematic',
        transition: 'Fade to Black'
      })
    }
  ];

  for (const template of templates) {
    await connection.query(
      `INSERT INTO project_templates 
       (name, description, genre, plot_summary, characters, initial_context, director_settings, is_system_template)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        template.name,
        template.description,
        template.genre,
        template.plot_summary,
        template.characters,
        template.initial_context,
        template.director_settings
      ]
    );
  }

  console.log(`✅ Created ${templates.length} system templates`);
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

