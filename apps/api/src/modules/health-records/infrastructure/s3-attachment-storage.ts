import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentStorage, SignedUrl } from '../application/attachment-storage.port';

/** Adapter S3 (MinIO em desenvolvimento): o bucket é privado e só se acessa por URL assinada. */
@Injectable()
export class S3AttachmentStorage extends AttachmentStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    super();
    this.bucket = config.getOrThrow<string>('STORAGE_BUCKET');
    this.ttlSeconds = Number(config.get('STORAGE_URL_TTL_SECONDS') ?? 300);
    this.client = new S3Client({
      endpoint: config.get<string>('STORAGE_ENDPOINT'),
      region: config.get<string>('STORAGE_REGION') ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_KEY'),
      },
    });
  }

  createUploadUrl(key: string, mimeType: string): Promise<SignedUrl> {
    return this.sign(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType }),
    );
  }

  createDownloadUrl(key: string): Promise<SignedUrl> {
    return this.sign(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private async sign(command: PutObjectCommand | GetObjectCommand): Promise<SignedUrl> {
    const url = await getSignedUrl(this.client, command, { expiresIn: this.ttlSeconds });
    return { url, expiresAt: new Date(Date.now() + this.ttlSeconds * 1000) };
  }
}
