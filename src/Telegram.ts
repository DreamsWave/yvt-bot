import { InputMedia } from 'node-telegram-bot-api';
import { telegramClient } from './libs';
import { chunkSubstr } from './utils';
import { config } from './config';

class Telegram {
  channelId = config.tgChannelId;

  async sendMessageWithMultiplePhotos(text: string, photosUrl: string[]) {
    let photos: InputMedia[] = photosUrl.map((url) => ({
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

  async sendMessageWithPhoto(text = '', photoUrl: string) {
    const CAPTION_LENGTH = 1024;
    const MESSAGE_LENGTH = 4096;
    const linkLength = 20 + photoUrl.length;
    if (text.length <= CAPTION_LENGTH) {
      await telegramClient.sendPhoto(-this.channelId, photoUrl, {
        caption: text,
        parse_mode: 'HTML',
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
      });

      if (text.length > 1024) {
        await this.sendLongMessage(otherTextChunks.join(' '), {
          oneNotification: false,
        });
      }
    }
  }

  async sendLongMessage(
    text: string,
    options?: {
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

export default Telegram;
