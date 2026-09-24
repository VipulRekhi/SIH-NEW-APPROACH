import { UserRepository } from '../repositories/user.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';
import { SafeUser, UserRole } from '../types/index.js';

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: SafeUser;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await UserRepository.existsByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    // Default public registration role is strictly 'technician'
    const technicianRole = await RoleRepository.findByName('technician');
    if (!technicianRole) {
      throw new AppError('Default user role configuration is missing.', 500, 'ROLE_CONFIG_ERROR');
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await UserRepository.create({
      fullName: input.full_name,
      email: input.email,
      passwordHash,
      roleId: technicianRole.id,
      laboratoryId: null
    });

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role_name as UserRole
    });

    return { token, user: newUser };
  }

  static async login(input: LoginInput): Promise<AuthResult> {
    const user = await UserRepository.findByEmailWithPassword(input.email);
    if (!user) {
      throw new AppError('Invalid email address or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.is_active) {
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await comparePassword(input.password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email address or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role_name as UserRole
    });

    // Remove password hash from returned object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user;

    return { token, user: safeUser };
  }

  static async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await UserRepository.findByIdSafe(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }
}
