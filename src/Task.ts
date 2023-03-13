import {
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodbClient } from './libs';
import { TaskType } from './types';

class Task {
  tableName = 'tasks';

  async get(postId: number | string): Promise<TaskType | null> {
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
        return unmarshall(Item) as TaskType;
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
            done: false,
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

  async update(postId: number | string, taskData: TaskType): Promise<TaskType | null> {
    try {
      const { Attributes } = await dynamodbClient.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            task_id: String(postId),
          }),
          UpdateExpression: 'set done = :d, processing = :p',
          ExpressionAttributeValues: marshall({
            ':d': taskData.done,
            ':p': taskData.processing,
          }),
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      if (Attributes) {
        return unmarshall(Attributes) as TaskType;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async delete(postId: number | string): Promise<boolean> {
    try {
      const response = await dynamodbClient.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: marshall({
            task_id: String(postId),
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

  async createTable(): Promise<boolean> {
    try {
      const response = await dynamodbClient.send(
        new CreateTableCommand({
          TableName: this.tableName,
          AttributeDefinitions: [
            {
              AttributeName: 'task_id',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'task_id',
              KeyType: 'HASH',
            },
          ],
        }),
      );
      if (response) return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  async deleteTable(): Promise<boolean> {
    try {
      const response = await dynamodbClient.send(
        new DeleteTableCommand({
          TableName: this.tableName,
        }),
      );
      if (response) return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  async clearTable(): Promise<boolean> {
    try {
      await this.deleteTable();
      await this.createTable();
      return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  }
}

export default new Task();
