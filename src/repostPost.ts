import Telegram from './Telegram';
import { getPhotosUrlFromAttachments } from './utils';
import { WallWallpostType } from './types';

export async function repostPost(post: WallWallpostType) {
  const telegram = new Telegram();

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

  await telegram.sendLongMessage(post.text, { oneNotification: true });
  return;
}
