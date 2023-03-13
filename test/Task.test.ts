import { describe, expect, test } from '@jest/globals';
import Task from '../src/Task';

describe('class Task', () => {
  test('should create task', async () => {
    const result = await Task.create('000');
    expect(result).toBeTruthy();
  });
  test('should get task', async () => {
    const task = await Task.get('000');
    expect(task?.done).toBe(false);
    expect(task?.processing).toBe(false);
  });
  test('should update task', async () => {
    const task = await Task.update('000', { done: true, processing: true });
    expect(task?.done).toBe(true);
    expect(task?.processing).toBe(true);
  });
  test('should delete task', async () => {
    const result = await Task.delete('000');
    expect(result).toBeTruthy();
  });
  test('should clear table', async () => {
    const result = await Task.clearTable();
    expect(result).toBeTruthy();
  });
});
