import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Audit } from '../../../infrastructure/http/audit.interceptor';
import { SignedUrl } from '../application/attachment-storage.port';
import {
  CreateHealthRecordUseCase,
  HealthRecordWithReminder,
} from '../application/create-health-record.use-case';
import { DeleteHealthRecordUseCase } from '../application/delete-health-record.use-case';
import { GetAttachmentDownloadUseCase } from '../application/get-attachment-download.use-case';
import { GetHealthRecordUseCase } from '../application/get-health-record.use-case';
import { ListHealthRecordsUseCase } from '../application/list-health-records.use-case';
import {
  RequestAttachmentUploadOutput,
  RequestAttachmentUploadUseCase,
} from '../application/request-attachment-upload.use-case';
import { UpdateHealthRecordUseCase } from '../application/update-health-record.use-case';
import { HealthRecordProps } from '../domain/health-record';
import {
  CreateHealthRecordDto,
  RequestAttachmentUploadDto,
  UpdateHealthRecordDto,
} from './dto';

/**
 * A guarda de sessão só deixa passar o `holderId` da sessão (ADR 04); os
 * casos de uso ainda conferem se o registro é do titular.
 */
@Controller('holders/:holderId/records')
export class HealthRecordsController {
  constructor(
    private readonly createHealthRecord: CreateHealthRecordUseCase,
    private readonly listHealthRecords: ListHealthRecordsUseCase,
    private readonly getHealthRecord: GetHealthRecordUseCase,
    private readonly updateHealthRecord: UpdateHealthRecordUseCase,
    private readonly deleteHealthRecord: DeleteHealthRecordUseCase,
    private readonly requestAttachmentUpload: RequestAttachmentUploadUseCase,
    private readonly getAttachmentDownload: GetAttachmentDownloadUseCase,
  ) {}

  @Audit('record.create')
  @Post()
  create(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Body() body: CreateHealthRecordDto,
  ): Promise<HealthRecordWithReminder> {
    return this.createHealthRecord.execute({ holderId, ...body });
  }

  @Audit('record.list')
  @Get()
  list(@Param('holderId', ParseUUIDPipe) holderId: string): Promise<HealthRecordProps[]> {
    return this.listHealthRecords.execute({ holderId });
  }

  @Audit('record.get')
  @Get(':recordId')
  findOne(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): Promise<HealthRecordWithReminder> {
    return this.getHealthRecord.execute({ holderId, recordId });
  }

  @Audit('record.update')
  @Patch(':recordId')
  update(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: UpdateHealthRecordDto,
  ): Promise<HealthRecordWithReminder> {
    return this.updateHealthRecord.execute({ ...body, holderId, recordId });
  }

  @Audit('record.delete')
  @Delete(':recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): Promise<void> {
    return this.deleteHealthRecord.execute({ holderId, recordId });
  }

  @Audit('attachment.request-upload')
  @Post(':recordId/attachments')
  requestUpload(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: RequestAttachmentUploadDto,
  ): Promise<RequestAttachmentUploadOutput> {
    return this.requestAttachmentUpload.execute({ holderId, recordId, ...body });
  }

  @Audit('attachment.download')
  @Get(':recordId/attachments/:attachmentId/download')
  download(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<SignedUrl> {
    return this.getAttachmentDownload.execute({ holderId, recordId, attachmentId });
  }
}
