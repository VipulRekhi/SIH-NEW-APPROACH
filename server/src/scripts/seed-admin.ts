import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { UserRepository } from '../repositories/user.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';
import { hashPassword } from '../utils/password.js';

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nawi.gov.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  console.log(`[Seed Admin] Checking admin user: ${adminEmail}`);

  const existing = await UserRepository.findByEmailWithPassword(adminEmail);
  if (existing) {
    console.log('[Seed Admin] Admin user already exists.');
    process.exit(0);
  }

  const adminRole = await RoleRepository.findByName('admin');
  if (!adminRole) {
    console.error('[Seed Admin Error] "admin" role not found in database.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(adminPassword);

  const user = await UserRepository.create({
    fullName: adminName,
    email: adminEmail,
    passwordHash,
    roleId: adminRole.id,
    laboratoryId: null
  });

  console.log(`[Seed Admin] Successfully created admin user: ${user.email} (Role: ${user.role_name})`);
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('[Seed Admin Error]', err);
  process.exit(1);
});
