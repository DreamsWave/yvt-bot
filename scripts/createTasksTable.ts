import Task from '../src/Task';

const createConfigsTable = async () => {
  await Task.createTable();
};

createConfigsTable();
