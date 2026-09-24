import { UserRepository } from '../repositories/user.repository.js';
import { SafeUser } from '../types/index.js';

export class UserService {
  static async listUsers(): Promise<SafeUser[]> {
    return UserRepository.listAllSafe();
  }

  static async getUserById(id: string): Promise<SafeUser | null> {
    return UserRepository.findByIdSafe(id);
  }
}
