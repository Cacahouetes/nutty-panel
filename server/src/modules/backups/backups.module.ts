import { Module } from '@nestjs/common'
import { join } from 'node:path'
import { DockerModule } from '../docker/docker.module'
import { DOCKER_SERVICE, type DockerService } from '../docker/docker.service'
import { ARCHIVE_STORE, type ArchiveStore } from './archive.store'
import { BACKUP_POLICY_STORE, type BackupPolicyStore } from './backup-policy.store'
import { BACKUP_SCHEDULER, createBackupScheduler } from './backup.scheduler'
import { BACKUPS_REPOSITORY, type BackupsRepository } from './backups.repository'
import { BACKUPS_SERVICE, createBackupsService, type BackupsService } from './backups.service'
import { BackupsController } from './backups.controller'
import { BackupTicker } from './backup.ticker'
import { DockerServerDataAccess } from './docker-server-data'
import { InMemoryBackupPolicyStore } from './in-memory.backup-policy.store'
import { InMemoryBackupsRepository } from './in-memory.backups.repository'
import { LocalArchiveStore } from './local.archive.store'
import { SERVER_DATA_ACCESS, type ServerDataAccess } from './server-data'

const BACKUPS_DIR = process.env.BACKUPS_DIR ?? join(process.cwd(), 'data', 'backups')

@Module({
  imports: [DockerModule],
  controllers: [BackupsController],
  providers: [
    { provide: BACKUPS_REPOSITORY, useClass: InMemoryBackupsRepository },
    { provide: ARCHIVE_STORE, useValue: new LocalArchiveStore(BACKUPS_DIR) },
    {
      provide: SERVER_DATA_ACCESS,
      useFactory: (docker: DockerService): ServerDataAccess => new DockerServerDataAccess(docker),
      inject: [DOCKER_SERVICE],
    },
    { provide: BACKUP_POLICY_STORE, useClass: InMemoryBackupPolicyStore },
    {
      provide: BACKUPS_SERVICE,
      useFactory: (
        repository: BackupsRepository,
        archiveStore: ArchiveStore,
        serverData: ServerDataAccess,
      ) => createBackupsService({ repository, archiveStore, serverData }),
      inject: [BACKUPS_REPOSITORY, ARCHIVE_STORE, SERVER_DATA_ACCESS],
    },
    {
      provide: BACKUP_SCHEDULER,
      useFactory: (
        policyStore: BackupPolicyStore,
        repository: BackupsRepository,
        backupsService: BackupsService,
      ) =>
        createBackupScheduler({
          policyStore,
          repository,
          createBackup: (serverId, maxBackups) => backupsService.createBackup(serverId, maxBackups),
        }),
      inject: [BACKUP_POLICY_STORE, BACKUPS_REPOSITORY, BACKUPS_SERVICE],
    },
    BackupTicker,
  ],
})
export class BackupsModule {}
