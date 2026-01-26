import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
  Message,
  ReceiveMessageCommandInput,
  DeleteMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import config from '../config';
import { InternalServerError } from '../utils/error.util';

export interface SQSMessage {
  messageId: string;
  body: string;
  receiptHandle: string;
  attributes?: Record<string, string>;
}

export interface SQSServiceOptions {
  queueUrl: string;
  maxNumberOfMessages?: number;
  // waitTimeSeconds?: number;
  // visibilityTimeout?: number;
  pollInterval?: number;
  batchDelete?: boolean;
}

export type MessageHandler = (message: SQSMessage) => Promise<void>;

export class SQSService {
  private client: SQSClient;
  private isPolling: boolean = false;
  private options: Required<SQSServiceOptions>;
  private messageHandler?: MessageHandler;
  private pollTimeoutId?: NodeJS.Timeout;

  constructor(options: SQSServiceOptions) {
    // Initialize SQS client with AWS credentials from config
    this.client = new SQSClient({
      region: config.aws.region,
      credentials:
        config.aws.accessKeyId && config.aws.secretAccessKey
          ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
          : undefined,
    });

    // Set default options
    this.options = {
      queueUrl: options.queueUrl,
      maxNumberOfMessages: options.maxNumberOfMessages ?? 10,
      pollInterval: options.pollInterval ?? 1000,
      batchDelete: options.batchDelete ?? true,
    };
  }

  /**
   * Set the message handler function that will process each message
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Start polling for messages from SQS
   */
  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('[SQSService] Already polling');
      return;
    }

    if (!this.messageHandler) {
      throw new InternalServerError('Message handler not set. Call setMessageHandler() first.');
    }

    this.isPolling = true;
    console.log(`[SQSService] Started polling queue: ${this.options.queueUrl}`);

    // Start the polling loop
    await this.poll();
  }

  /**
   * Stop polling for messages
   */
  stopPolling(): void {
    this.isPolling = false;
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = undefined;
    }
    console.log('[SQSService] Stopped polling');
  }

  /**
   * Main polling loop
   * Fetches 10 messages, processes them one by one, then fetches next batch
   */
  private async poll(): Promise<void> {
    while (this.isPolling) {
      try {
        // Fetch up to 10 messages
        const messages = await this.receiveMessages();

        if (messages.length > 0) {
          console.log(
            `[SQSService] Received ${messages.length} message(s) - processing sequentially`,
          );
          // Process all messages one by one before fetching next batch
          await this.processMessages(messages);
          console.log(`[SQSService] Batch processing completed, fetching next batch...`);
        } else {
          // No messages available, wait before next poll
          await this.sleep(this.options.pollInterval);
        }
      } catch (error) {
        console.error('[SQSService] Error in polling loop:', error);
        // Wait before retrying after an error
        await this.sleep(this.options.pollInterval);
      }
    }
  }

  /**
   * Receive messages from SQS queue
   */
  private async receiveMessages(): Promise<Message[]> {
    const params: ReceiveMessageCommandInput = {
      QueueUrl: this.options.queueUrl,
      MaxNumberOfMessages: this.options.maxNumberOfMessages,
      // WaitTimeSeconds: this.options.waitTimeSeconds,
      // VisibilityTimeout: this.options.visibilityTimeout,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
    };

    const command = new ReceiveMessageCommand(params);
    const response = await this.client.send(command);

    return response.Messages || [];
  }

  /**
   * Process received messages sequentially (one by one)
   * Only processes next batch after all current messages are completed
   */
  private async processMessages(messages: Message[]): Promise<void> {
    const successfulMessages: Message[] = [];
    const failedMessages: Message[] = [];

    // Process messages sequentially (one by one)
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      try {
        if (!message.Body || !message.ReceiptHandle) {
          console.warn('[SQSService] Invalid message format:', message.MessageId);
          failedMessages.push(message);
          continue;
        }

        const sqsMessage: SQSMessage = {
          messageId: message.MessageId || 'unknown',
          body: message.Body,
          receiptHandle: message.ReceiptHandle,
          attributes: message.Attributes,
        };

        console.log(
          `[SQSService] Processing message ${i + 1} of ${messages.length}: ${message.MessageId}`,
        );

        // Call the user-defined message handler (sequential processing)
        if (this.messageHandler) {
          await this.messageHandler(sqsMessage);
        }

        successfulMessages.push(message);
        console.log(`[SQSService] ✓ Successfully processed message ${i + 1} of ${messages.length}`);
      } catch (error) {
        console.error(
          `[SQSService] ✗ Error processing message ${i + 1} of ${messages.length} (${message.MessageId}):`,
          error,
        );
        failedMessages.push(message);
        // Continue processing next message even if one fails
      }
    }

    // Delete successfully processed messages
    if (successfulMessages.length > 0) {
      await this.deleteMessages(successfulMessages);
    }

    if (failedMessages.length > 0) {
      console.warn(
        `[SQSService] ${failedMessages.length} message(s) failed processing and will be retried`,
      );
    }

    console.log(
      `[SQSService] Completed batch: ${successfulMessages.length} succeeded, ${failedMessages.length} failed`,
    );
  }

  /**
   * Delete messages from queue after successful processing
   */
  private async deleteMessages(messages: Message[]): Promise<void> {
    if (this.options.batchDelete && messages.length > 1) {
      await this.deleteMessagesBatch(messages);
    } else {
      // Delete messages individually
      await Promise.allSettled(messages.map((message) => this.deleteMessage(message)));
    }
  }

  /**
   * Delete a single message
   */
  private async deleteMessage(message: Message): Promise<void> {
    if (!message.ReceiptHandle) {
      console.warn('[SQSService] Cannot delete message without receipt handle');
      return;
    }

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      });

      await this.client.send(command);
      console.log(`[SQSService] Deleted message: ${message.MessageId}`);
    } catch (error) {
      console.error(`[SQSService] Error deleting message ${message.MessageId}:`, error);
    }
  }

  /**
   * Delete messages in batch (more efficient for multiple messages)
   */
  private async deleteMessagesBatch(messages: Message[]): Promise<void> {
    // SQS batch delete supports max 10 messages at a time
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const entries: DeleteMessageBatchRequestEntry[] = batch
        .filter((msg) => msg.ReceiptHandle)
        .map((msg, index) => ({
          Id: `msg-${i + index}`,
          ReceiptHandle: msg.ReceiptHandle!,
        }));

      if (entries.length === 0) continue;

      try {
        const command = new DeleteMessageBatchCommand({
          QueueUrl: this.options.queueUrl,
          Entries: entries,
        });

        const response = await this.client.send(command);

        if (response.Successful && response.Successful.length > 0) {
          console.log(`[SQSService] Batch deleted ${response.Successful.length} message(s)`);
        }

        if (response.Failed && response.Failed.length > 0) {
          console.error(
            `[SQSService] Failed to delete ${response.Failed.length} message(s):`,
            response.Failed,
          );
        }
      } catch (error) {
        console.error('[SQSService] Error in batch delete:', error);
      }
    }
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pollTimeoutId = setTimeout(() => {
        this.pollTimeoutId = undefined;
        resolve();
      }, ms);
    });
  }

  /**
   * Get current polling status
   */
  isCurrentlyPolling(): boolean {
    return this.isPolling;
  }

  /**
   * Close the SQS client connection
   */
  async close(): Promise<void> {
    this.stopPolling();
    this.client.destroy();
    console.log('[SQSService] Client connection closed');
  }
}

export default SQSService;
