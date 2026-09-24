import { LaboratoryRepository } from '../repositories/laboratory.repository.js';
import { Laboratory } from '../types/index.js';

export class LaboratoryService {
  static async listLaboratories(): Promise<Laboratory[]> {
    return LaboratoryRepository.listAll();
  }

  static async createLaboratory(data: { name: string; address?: string; contact_email?: string }): Promise<Laboratory> {
    return LaboratoryRepository.create(data);
  }
}
