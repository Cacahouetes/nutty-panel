import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common'
import { MIN_INTERVAL_MINUTES, type BackupPolicy } from './backup'
import { BACKUP_POLICY_STORE, type BackupPolicyStore } from './backup-policy.store'
import { BACKUPS_SERVICE, ValidationError, type BackupsService } from './backups.service'
import { BackupsExceptionFilter } from './backups.exception-filter'

@Controller('api')
@UseFilters(BackupsExceptionFilter)
export class BackupsController {
  constructor(
    @Inject(BACKUPS_SERVICE) private readonly backups: BackupsService,
    @Inject(BACKUP_POLICY_STORE) private readonly policies: BackupPolicyStore,
  ) {}

  @Post('servers/:serverId/backups')
  createBackup(@Param('serverId') serverId: string) {
    return this.backups.createBackup(serverId)
  }

  @Get('servers/:serverId/backups')
  listBackups(@Param('serverId') serverId: string) {
    return this.backups.listBackups(serverId)
  }

  @Post('backups/:backupId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restore(@Param('backupId') backupId: string): Promise<void> {
    await this.backups.restore(backupId)
  }

  @Delete('backups/:backupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('backupId') backupId: string): Promise<void> {
    await this.backups.deleteBackup(backupId)
  }

  @Get('servers/:serverId/backup-policy')
  getPolicy(@Param('serverId') serverId: string) {
    return this.policies.get(serverId)
  }

  @Patch('servers/:serverId/backup-policy')
  async setPolicy(
    @Param('serverId') serverId: string,
    @Body() body: Partial<Pick<BackupPolicy, 'intervalMinutes' | 'maxBackups'>>,
  ): Promise<BackupPolicy> {
    if (body.intervalMinutes !== undefined && body.intervalMinutes < MIN_INTERVAL_MINUTES) {
      throw new ValidationError(`intervalMinutes must be at least ${MIN_INTERVAL_MINUTES}`)
    }
    if (body.maxBackups !== undefined && body.maxBackups < 1) {
      throw new ValidationError('maxBackups must be at least 1')
    }
    const existing = await this.policies.get(serverId)
    return this.policies.set({
      serverId,
      intervalMinutes: body.intervalMinutes ?? existing?.intervalMinutes ?? 60,
      maxBackups: body.maxBackups ?? existing?.maxBackups ?? 5,
    })
  }
}
