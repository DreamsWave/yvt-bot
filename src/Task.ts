import { PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodbClient } from './libs';

interface TaskData {
  ready: boolean;
  processing: boolean;
}

class Task {
  tableName = 'tasks';
  async get(postId: number | string): Promise<TaskData | null> {
    try {
      const { Item } = await dynamodbClient.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: marshall({
            task_id: String(postId),
          }),
        }),
      );
      if (Item) {
        return unmarshall(Item) as TaskData;
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
            task_id: String(postId),
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
  async update(postId: number | string, TaskData: TaskData): Promise<TaskData | null> {
    try {
      const { Attributes } = await dynamodbClient.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            task_id: String(postId),
          }),
          UpdateExpression: 'set ready = :r, processing = :p',
          ExpressionAttributeValues: marshall({
            ':r': TaskData.ready,
            ':p': TaskData.processing,
          }),
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      if (Attributes) {
        return unmarshall(Attributes) as TaskData;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }
}

export default new Task();
