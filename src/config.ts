import dotenv from 'dotenv';
dotenv.config();

type ConfigType = {
  region: string;
  ymqEndpoint: string;
  ymqQueueUrl: string;
  docApiEndpoint: string;
  vkCallback: string;
  vkGroupId: number;
  tgToken: string;
  tgChannelId: number;
};

export const config: ConfigType = {
  region: 'ru-central1',
  ymqEndpoint: 'https://message-queue.api.cloud.yandex.net',
  ymqQueueUrl: process.env.YMQ_QUEUE_URL,
  docApiEndpoint: process.env.DOCAPI_ENDPOINT,
  vkCallback: process.env.VK_CALLBACK,
  vkGroupId: Number(process.env.VK_GROUP_ID),
  tgToken: process.env.TG_TOKEN || '',
  tgChannelId: Number(process.env.TG_CHANNEL_ID),
};
