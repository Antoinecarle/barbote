import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running Barbote database migrations...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema created/updated successfully');

    // Seed admin user if not exists
    const adminEmail = process.env.BARBOTE_ADMIN_EMAIL || 'admin@barbote.local';
    const adminPassword = process.env.BARBOTE_ADMIN_PASSWORD_HASH;

    if (adminPassword) {
      await client.query(`
        INSERT INTO barbote_users (email, password_hash, name, role, cellar_name)
        VALUES ($1, $2, 'Administrateur', 'admin', 'Cave Principale')
        ON CONFLICT (email) DO NOTHING
      `, [adminEmail, adminPassword]);
      console.log('✅ Admin user seeded');
    } else {
      // Default admin for dev
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO barbote_users (email, password_hash, name, role, cellar_name)
        VALUES ($1, $2, 'Administrateur', 'admin', 'Cave Principale')
        ON CONFLICT (email) DO NOTHING
      `, [adminEmail, hash]);
      console.log('✅ Default admin user seeded (email: admin@barbote.local, password: admin123)');
    }

    // Seed sample containers
    await client.query(`
      INSERT INTO barbote_containers (code, name, type, capacity_liters, location, status)
      VALUES
        ('C001', 'Cuve Inox 1', 'cuve_inox', 10000, 'Chais 1', 'available'),
        ('C002', 'Cuve Inox 2', 'cuve_inox', 10000, 'Chais 1', 'available'),
        ('C003', 'Cuve Béton 1', 'cuve_beton', 15000, 'Chais 1', 'available'),
        ('B001', 'Barrique 225L #1', 'barrique', 225, 'Cave 1', 'available'),
        ('B002', 'Barrique 225L #2', 'barrique', 225, 'Cave 1', 'available'),
        ('F001', 'Foudre 5000L', 'foudre', 5000, 'Chais 2', 'available')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Sample containers seeded');

    console.log('✅ Barbote migrations complete!');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
