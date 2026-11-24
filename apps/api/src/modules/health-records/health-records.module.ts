import { Module } from '@nestjs/common';
import { AttachmentStorage } from './application/attachment-storage.port';
import { CreateHealthRecordUseCase } from './application/create-health-record.use-case';
import { GetAttachmentDownloadUseCase } from './application/get-attachment-download.use-case';
import { ListHealthRecordsUseCase } from './application/list-health-records.use-case';
import { RequestAttachmentUploadUseCase } from './application/request-attachment-upload.use-case';
import { HealthRecordRepository } from './domain/health-record.repository';
import { PrismaHealthRecordRepository } from './infrastructure/prisma-health-record.repository';
import { S3AttachmentStorage } from './infrastructure/s3-attachment-storage';
import { HealthRecordsController } from './presentation/health-records.controller';

@Module({
  controllers: [HealthRecordsController],
  providers: [
    { provide: HealthRecordRepository, useClass: PrismaHealthRecordRepository },
    { provide: AttachmentStorage, useClass: S3AttachmentStorage },
    {
      provide: CreateHealthRecordUseCase,
      inject: [HealthRecordRepository],
      useFactory: (repo: HealthRecordRepository) => new CreateHealthRecordUseCase(repo),
    },
    {
      provide: ListHealthRecordsUseCase,
      inject: [HealthRecordRepository],
      useFactory: (repo: HealthRecordRepository) => new ListHealthRecordsUseCase(repo),
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
