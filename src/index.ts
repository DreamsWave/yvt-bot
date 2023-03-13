import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { Handler } from '@yandex-cloud/function-types';
import { config } from './config';
import { sqsClient } from './libs';
import { repostPost } from './repostPost';
import Task from './Task';
import { TaskType, VKEventType, WallWallpostType } from './types';

export const defaultReturn = {
  statusCode: 200,
  body: 'ok',
};

export const handle_vk_cb: Handler.Http = async (event, context) => {
  let vkEvent: VKEventType;
  try {
    vkEvent = JSON.parse(event.body);
    console.log(JSON.stringify(vkEvent));
  } catch (error) {
    console.error(error);
    return defaultReturn;
  }

  if (vkEvent?.group_id !== config.vkGroupId) return defaultReturn;

  if (vkEvent?.type === 'confirmation') {
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

    let postTask: TaskType;
    try {
      postTask = await Task.get(post.id);
      if (postTask?.done || postTask?.processing) return defaultReturn;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw error;
    }

    if (!postTask) {
      try {
        await Task.create(post.id);
      } catch (error) {
        console.log("Couldn't create post task: ", JSON.stringify(error));
        throw error;
      }
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
      throw error;
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
      if (!postTask || postTask?.done || postTask?.processing) return;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw error;
    }

    try {
      await Task.update(post.id, { done: false, processing: true });
      await repostPost(post);
      await Task.update(post.id, { done: true, processing: false });
    } catch (error) {
      console.log(JSON.stringify(error));
      await Task.update(post.id, { done: false, processing: false });
      throw error;
    }
  }
};
