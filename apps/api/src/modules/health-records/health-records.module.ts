import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../core/application/unit-of-work.port';
import { RemindersModule } from '../reminders/reminders.module';
import { AttachmentStorage } from './application/attachment-storage.port';
import { ConsultationReminders } from './application/consultation-reminders.port';
import { CreateHealthRecordUseCase } from './application/create-health-record.use-case';
import { DeleteHealthRecordUseCase } from './application/delete-health-record.use-case';
import { GetAttachmentDownloadUseCase } from './application/get-attachment-download.use-case';
import { GetHealthRecordUseCase } from './application/get-health-record.use-case';
import { ListHealthRecordsUseCase } from './application/list-health-records.use-case';
import { RequestAttachmentUploadUseCase } from './application/request-attachment-upload.use-case';
import { UpdateHealthRecordUseCase } from './application/update-health-record.use-case';
import { HealthRecordRepository } from './domain/health-record.repository';
import { PrismaHealthRecordRepository } from './infrastructure/prisma-health-record.repository';
import { RemindersModuleAdapter } from './infrastructure/reminders-module.adapter';
import { S3AttachmentStorage } from './infrastructure/s3-attachment-storage';
import { HealthRecordsController } from './presentation/health-records.controller';

@Module({
  imports: [RemindersModule],
  controllers: [HealthRecordsController],
  providers: [
    { provide: HealthRecordRepository, useClass: PrismaHealthRecordRepository },
    { provide: AttachmentStorage, useClass: S3AttachmentStorage },
    { provide: ConsultationReminders, useClass: RemindersModuleAdapter },
    {
      provide: CreateHealthRecordUseCase,
      inject: [HealthRecordRepository, ConsultationReminders, UnitOfWork],
      useFactory: (repo: HealthRecordRepository, reminders: ConsultationReminders, uow: UnitOfWork) =>
        new CreateHealthRecordUseCase(repo, reminders, uow),
    },
    {
      provide: ListHealthRecordsUseCase,
      inject: [HealthRecordRepository],
      useFactory: (repo: HealthRecordRepository) => new ListHealthRecordsUseCase(repo),
    },
    {
      provide: GetHealthRecordUseCase,
      inject: [HealthRecordRepository, ConsultationReminders],
      useFactory: (repo: HealthRecordRepository, reminders: ConsultationReminders) =>
        new GetHealthRecordUseCase(repo, reminders),
    },
    {
      provide: UpdateHealthRecordUseCase,
      inject: [HealthRecordRepository, ConsultationReminders, UnitOfWork],
      useFactory: (repo: HealthRecordRepository, reminders: ConsultationReminders, uow: UnitOfWork) =>
        new UpdateHealthRecordUseCase(repo, reminders, uow),
    },
    {
      provide: DeleteHealthRecordUseCase,
      inject: [HealthRecordRepository, ConsultationReminders, AttachmentStorage, UnitOfWork],
      useFactory: (
        repo: HealthRecordRepository,
        reminders: ConsultationReminders,
        storage: AttachmentStorage,
        uow: UnitOfWork,
      ) => new DeleteHealthRecordUseCase(repo, reminders, storage, uow),
    },
    {
      provide: RequestAttachmentUploadUseCase,
      inject: [HealthRecordRepository, AttachmentStorage],
      useFactory: (repo: HealthRecordRepository, storage: AttachmentStorage) =>
        new RequestAttachmentUploadUseCase(repo, storage),
    },
    {
      provide: GetAttachmentDownloadUseCase,
      inject: [HealthRecordRepository, AttachmentStorage],
      useFactory: (repo: HealthRecordRepository, storage: AttachmentStorage) =>
        new GetAttachmentDownloadUseCase(repo, storage),
    },
  ],
})
export class HealthRecordsModule {}
