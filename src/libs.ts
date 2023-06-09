process.env.NTBA_FIX_319 = '1'; // required by node-telegram-bot-api
process.env.NTBA_FIX_350 = '0'; // required by node-telegram-bot-api
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';

const sqsClient = new SQSClient({
  region: config.region,
  endpoint: config.ymqEndpoint,
});

const dynamodbClient = new DynamoDBClient({
  region: config.region,
  endpoint: config.docApiEndpoint,
});

const telegramClient = new TelegramBot(config.tgToken);

export { sqsClient, dynamodbClient, telegramClient };
