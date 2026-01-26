import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';

export class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.aws.s3.bucketName || '';

    if (!this.bucketName) {
      logger.warn('AWS S3 bucket name not configured. S3 uploads will be disabled.');
    }

    // Initialize S3 client with AWS credentials from config
    // Only include credentials if explicitly provided, otherwise let SDK use default credential provider chain
    // (IAM instance profile on EC2, environment variables, etc.)
    const clientConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = {
      region: config.aws.region,
    };

    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
  }

  /**
   * Upload a file to S3
   * @param filePath - Local file path to upload
   * @param s3Key - S3 object key (path in bucket). If not provided, uses filename from filePath
   * @param contentType - MIME type of the file (default: text/html)
   * @returns S3 URL of the uploaded file
   */
  async uploadFile(
    filePath: string,
    s3Key?: string,
    contentType: string = 'text/html',
  ): Promise<string | null> {
    if (!this.bucketName) {
      logger.warn('S3 bucket not configured. Skipping upload.');
      return null;
    }

    try {
      // Read the file
      const fileContent = await fs.readFile(filePath);

      // Generate S3 key if not provided
      const key = s3Key || this.generateS3Key(filePath);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        // Make the file publicly readable (optional - remove if you want private files)
        // ACL: 'public-read',
      });

      await this.client.send(command);

      // Generate and return the S3 URL
      const url = `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
      logger.info(`✓ Successfully uploaded file to S3: ${url}`);
      return url;
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';
      logger.error({ filePath, s3Key, error: errorMessage }, `Failed to upload file to S3: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Upload a buffer directly to S3
   * @param buffer - File buffer to upload
   * @param filename - Original filename
   * @param contentType - MIME type of the file
   * @param folder - S3 folder path (e.g., 'kyc-documents/tax-certificates')
   * @returns S3 URL of the uploaded file
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string = 'application/pdf',
    folder: string = 'kyc-documents',
  ): Promise<string | null> {
    if (!this.bucketName) {
      logger.warn('S3 bucket not configured. Skipping upload.');
      return null;
    }

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timestamp = Date.now();

      // Sanitize filename (remove special chars, spaces)
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

      // Create organized folder structure: kyc-documents/{folder}/YYYY/MM/DD/timestamp_filename
      const key = `${folder}/${year}/${month}/${day}/${timestamp}_${sanitizedFilename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      const url = `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
      logger.info(`✓ Successfully uploaded buffer to S3: ${url}`);
      return url;
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';
      logger.error({ filename, folder, error: errorMessage }, `Failed to upload buffer to S3: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Upload KYC document (wrapper for uploadBuffer with KYC-specific folder structure)
   * @param buffer - File buffer to upload
   * @param filename - Original filename
   * @param documentType - Type of document (tax-certificates, board-resolutions, other)
   * @param contentType - MIME type of the file
   * @returns S3 URL of the uploaded file
   */
  async uploadKYCDocument(
    buffer: Buffer,
    filename: string,
    documentType: 'tax-certificates' | 'board-resolutions' | 'other' = 'other',
    contentType: string = 'application/pdf',
  ): Promise<string | null> {
    const folder = `kyc-documents/${documentType}`;
    return this.uploadBuffer(buffer, filename, contentType, folder);
  }

  /**
   * Upload user avatar image to S3
   * @param buffer - Avatar image buffer
   * @param filename - Original filename
   * @param contentType - MIME type (e.g., image/png)
   * @returns Public S3 URL of the uploaded avatar
   */
  async uploadUserAvatar(
    buffer: Buffer,
    filename: string,
    contentType: string = 'image/png',
  ): Promise<string | null> {
    const folder = 'user-avatars';
    return this.uploadBuffer(buffer, filename, contentType, folder);
  }

  /**
   * Generate S3 key from file path
   * Creates a path like: flight-maps/2025/12/08/filename.html
   */
  private generateS3Key(filePath: string): string {
    const filename = path.basename(filePath);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Create organized folder structure: flight-maps/YYYY/MM/DD/filename.html
    return `flight-maps/${year}/${month}/${day}/${filename}`;
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!this.bucketName && !!config.aws.accessKeyId && !!config.aws.secretAccessKey;
  }
}

export default new S3Service();
