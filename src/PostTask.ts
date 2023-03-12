import { PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodbClient } from './libs';

interface PostTaskData {
  ready: boolean;
  processing: boolean;
}

class PostTask {
  tableName = 'posts_tasks';
  async get(postId: number | string): Promise<PostTaskData | null> {
    try {
      const { Item } = await dynamodbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: marshall({
            post_id: String(postId),
          }),
        }),
      );
      if (Item) {
        return unmarshall(Item) as PostTaskData;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async create(postId: number | string): Promise<boolean> {
    try {
      const response = await dynamodbClient.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall({
            post_id: String(postId),
            ready: false,
            processing: false,
          }),
        }),
      );
      if (response) {
        return true;
      }
    } catch (error) {
      console.log(error);
    }
    return false;
  }
  async update(postId: number | string, postTaskData: PostTaskData): Promise<PostTaskData | null> {
    try {
      const { Attributes } = await dynamodbClient.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            post_id: String(postId),
          }),
          UpdateExpression: 'set ready = :r, processing = :p',
          ExpressionAttributeValues: marshall({
            ':r': postTaskData.ready,
            ':p': postTaskData.processing,
          }),
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      if (Attributes) {
        return unmarshall(Attributes) as PostTaskData;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }
}

export default new PostTask();
