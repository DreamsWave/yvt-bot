import { WallWallpost } from '@vkontakte/api-schema-typescript';

export type TaskType = {
  done: boolean;
  processing: boolean;
};

export type ConfigType = {
  region: string;
  ymqEndpoint: string;
  ymqQueueUrl: string;
  docApiEndpoint: string;
  vkCallback: string;
  vkGroupId: number;
  tgToken: string;
  tgChannelId: number;
};

export type WallWallpostType = WallWallpost & {
  marked_as_ads: number;
};

export type VKEventType = {
  group_id: number;
  type: string;
  event_id: string;
  v: string;
  object: WallWallpostType;
  secret?: string;
};
