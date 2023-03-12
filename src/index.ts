process.env.NTBA_FIX_319 = '1';
process.env.NTBA_FIX_350 = '0';

import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { WallWallpost } from '@vkontakte/api-schema-typescript';
import { Handler } from '@yandex-cloud/function-types';
import chunk from 'chunk-text';
import { config } from './config';
import { sqsClient } from './libs';
import { telegramClient } from './libs';
import Task from './Task';

export type WallWallpostType = WallWallpost & {
  marked_as_ads: number;
};

export type VKEvent = {
  group_id: number;
  type: string;
  event_id: string;
  v: string;
  object: WallWallpostType;
  secret?: string;
};

export const defaultReturn = {
  statusCode: 200,
  body: 'ok',
};

export const handle_vk_cb: Handler.Http = async (event, context) => {
  let vkEvent: VKEvent;
  try {
    vkEvent = JSON.parse(event.body);
    console.log(JSON.stringify(vkEvent));
  } catch (error) {
    console.error(error);
    return defaultReturn;
  }

  if (vkEvent?.type === 'confirmation' && vkEvent?.group_id === config.vkGroupId) {
    console.info('confirmation');
    return {
      statusCode: 200,
      body: config.vkCallback,
    };
  }

  if (vkEvent?.type === 'wall_post_new' && vkEvent?.object?.post_type === 'post') {
    const post = vkEvent.object as WallWallpostType;

    if (!post.id) return defaultReturn;

    if (post.marked_as_ads === 1) return defaultReturn;

    try {
      const postTask = await Task.get(post.id);
      if (postTask?.ready || postTask?.processing) return defaultReturn;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw error;
    }

    try {
      await sqsClient.send(
        new SendMessageCommand({
          MessageBody: JSON.stringify(post),
          QueueUrl: config.ymqQueueUrl,
        }),
      );
    } catch (error) {
      console.log("Couldn't send YMQ message: ", JSON.stringify(error));
    }
    try {
      await Task.create(post.id);
    } catch (error) {
      console.log("Couldn't create post task: ", JSON.stringify(error));
    }
  }

  return defaultReturn;
};

export const handle_wall_post_new: Handler.MessageQueue = async (event, context) => {
  for (const message of event.messages) {
    let post: WallWallpostType;
    try {
      post = JSON.parse(message.details.message.body);
      console.log(JSON.stringify(post));
      if (!post || !post.id) return;
    } catch (error) {
      console.log(JSON.stringify(error));
      return;
    }

    try {
      const postTask = await Task.get(post.id);
      if (postTask?.ready || postTask?.processing) return;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw error;
    }

    try {
      await Task.update(post.id, { ready: false, processing: true });
      await forwardPost(post);
      await Task.update(post.id, { ready: true, processing: false });
    } catch (error) {
      console.log(JSON.stringify(error));
      await Task.update(post.id, { ready: false, processing: false });
      throw error;
    }
  }
};

async function forwardPost(post: WallWallpostType) {
  const telegram = new Telegram({ token: config.tgToken, channelId: config.tgChannelId });

  // handle attachments
  if (post.attachments?.length) {
    const photosUrl = getPhotosUrlFromAttachments(post.attachments);
    if (photosUrl.length > 1) {
      await telegram.sendMessageWithMultiplePhotos(post.text, photosUrl);
    } else if (photosUrl.length === 1) {
      await telegram.sendMessageWithPhoto(post.text, photosUrl[0]);
    }
    return;
  }

  await telegram.sendLongMessage(post.text, {});
  return;
}

function getMediumSizeUrl(sizes) {
  const SMALL_SIZES = ['m', 's'];
  const MEDIUM_SIZES = ['y', 'r', 'q', 'p', ...SMALL_SIZES];
  const LARGE_SIZES = ['w', 'z', ...MEDIUM_SIZES];
  if (!sizes) {
    return null;
  }
  return MEDIUM_SIZES.map((sizeType) => sizes.find((size) => size.type === sizeType)).filter(Boolean)[0].url;
}

function getPhotosUrlFromAttachments(attachments) {
  return attachments
    .filter((attachment) => attachment.type === 'photo')
    .map((attachment) => getMediumSizeUrl(attachment.photo.sizes));
}

function chunkSubstr(str, size, firstElementSize?) {
  str = str.trim();
  if (firstElementSize) {
    const firstElementSizeChunks = chunk(str, firstElementSize);
    const mainChunks = chunk(firstElementSizeChunks.slice(1).join(' '), size);
    return [firstElementSizeChunks[0], ...mainChunks];
  }
  return chunk(str, size);
}

class Telegram {
  channelId;
  constructor({ token: string, channelId }) {
    this.channelId = channelId;
  }

  async sendMessageWithMultiplePhotos(text, photosUrl) {
    // const formattedPhotos = await formatWebpImagesToJpg(photosUrl);
    let photos = photosUrl.map((url) => ({
      type: 'photo',
      media: url,
    }));
    if (photos.length > 10) {
      photos = photos.slice(0, 10);
    }
    if (text.length <= 1024) {
      photos[0].caption = text;
      await telegramClient.sendMediaGroup(-this.channelId, photos, {
        disable_notification: false,
      });
    } else {
      const [firstTextChunk, ...otherTextChunks] = chunkSubstr(text, 4096, 1024);
      photos[0].caption = firstTextChunk;
      await telegramClient.sendMediaGroup(-this.channelId, photos, {
        disable_notification: false,
      });
      await this.sendLongMessage(otherTextChunks.join(' '), {
        oneNotification: false,
      });
    }
  }

  async sendMessageWithPhoto(text = '', photoUrl, options?) {
    const CAPTION_LENGTH = 1024;
    const MESSAGE_LENGTH = 4096;
    const linkLength = 20 + photoUrl.length;
    if (text.length <= CAPTION_LENGTH) {
      await telegramClient.sendPhoto(-this.channelId, photoUrl, {
        caption: text,
        parse_mode: 'HTML',
        ...options,
      });
    } else if (text.length > CAPTION_LENGTH && text.length <= MESSAGE_LENGTH - linkLength) {
      const linkPhoto = ` <a href="${photoUrl}">­</a>`;
      await this.sendLongMessage(text + linkPhoto, {
        oneNotification: false,
      });
    } else {
      const [firstTextChunk, ...otherTextChunks] = chunkSubstr(text, 4096, 1024);
      await telegramClient.sendPhoto(-this.channelId, photoUrl, {
        caption: firstTextChunk,
        parse_mode: 'HTML',
        ...options,
      });

      if (text.length > 1024) {
        await this.sendLongMessage(otherTextChunks.join(' '), {
          oneNotification: false,
        });
      }
    }
  }

  async sendLongMessage(
    text,
    options: {
      oneNotification?: boolean;
      chunkLength?: number;
      startOffset?: number;
    },
  ) {
    const { oneNotification = true, chunkLength = 4096, startOffset = 0 } = options;

    const textChunks = chunkSubstr(text.slice(startOffset), chunkLength);

    if (oneNotification) {
      await telegramClient.sendMessage(-this.channelId, textChunks[0], {
        disable_notification: false,
        parse_mode: 'HTML',
      });
      for (let i = 1; i < textChunks.length; i++) {
        await telegramClient.sendMessage(-this.channelId, textChunks[i], {
          disable_notification: true,
          parse_mode: 'HTML',
        });
      }
      return;
    }

    for (const text of textChunks) {
      await telegramClient.sendMessage(-this.channelId, text, {
        disable_notification: true,
        parse_mode: 'HTML',
      });
    }
  }
}
