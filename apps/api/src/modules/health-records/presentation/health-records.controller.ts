import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SignedUrl } from '../application/attachment-storage.port';
import { CreateHealthRecordUseCase } from '../application/create-health-record.use-case';
import { GetAttachmentDownloadUseCase } from '../application/get-attachment-download.use-case';
import { ListHealthRecordsUseCase } from '../application/list-health-records.use-case';
import {
  RequestAttachmentUploadOutput,
  RequestAttachmentUploadUseCase,
} from '../application/request-attachment-upload.use-case';
import { HealthRecordProps } from '../domain/health-record';
import { CreateHealthRecordDto, RequestAttachmentUploadDto } from './dto';

@Controller('holders/:holderId/records')
export class HealthRecordsController {
  constructor(
    private readonly createHealthRecord: CreateHealthRecordUseCase,
    private readonly listHealthRecords: ListHealthRecordsUseCase,
    private readonly requestAttachmentUpload: RequestAttachmentUploadUseCase,
    private readonly getAttachmentDownload: GetAttachmentDownloadUseCase,
  ) {}

  @Post()
  create(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Body() body: CreateHealthRecordDto,
  ): Promise<HealthRecordProps> {
    return this.createHealthRecord.execute({ holderId, ...body });
  }

  @Get()
  list(@Param('holderId', ParseUUIDPipe) holderId: string): Promise<HealthRecordProps[]> {
    return this.listHealthRecords.execute({ holderId });
  }

  @Post(':recordId/attachments')
  requestUpload(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: RequestAttachmentUploadDto,
  ): Promise<RequestAttachmentUploadOutput> {
    return this.requestAttachmentUpload.execute({ holderId, recordId, ...body });
  }

  @Get(':recordId/attachments/:attachmentId/download')
  download(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<SignedUrl> {
    return this.getAttachmentDownload.execute({ holderId, recordId, attachmentId });
  }
}
