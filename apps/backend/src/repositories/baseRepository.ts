/**
 * Abstract base repository — provides common type safety and
 * error wrapping around Prisma operations.
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export abstract class BaseRepository {
  protected readonly db = prisma;
  protected readonly log = logger.child({ context: 'repository' });
}
