import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BucketConfig } from './config';

export class Bucket {
  private readonly client: S3Client;

  constructor(private readonly config: BucketConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async *listKeys(prefix = ''): AsyncGenerator<string> {
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const item of page.Contents ?? []) {
        if (item.Key) {
          yield item.Key;
        }
      }
      token = page.NextContinuationToken;
    } while (token);
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    if (!result.Body) {
      throw new Error(`Objeto vazio: ${key}`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async put(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
}
