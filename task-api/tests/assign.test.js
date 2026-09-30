const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const createTask = (body = { title: 'Test task' }) => request(app).post('/tasks').send(body);

describe('taskService.assignTask', () => {
  test('stores the assignee and returns the updated task', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.assignTask(task.id, 'Alice');
    expect(updated.assignee).toBe('Alice');
    expect(taskService.findById(task.id).assignee).toBe('Alice');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.assignTask('nope', 'Alice')).toBeNull();
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns the task and returns it with 200', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(task.id);
  });

  test('the assignee is saved (visible in GET /tasks)', async () => {
    const { body: task } = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const list = await request(app).get('/tasks');
    expect(list.body[0].assignee).toBe('Alice');
  });

  test('does not change any other field', async () => {
    const { body: task } = await createTask({ title: 'Keep me', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    expect(res.body).toMatchObject({ title: 'Keep me', priority: 'high', status: 'todo' });
  });

  test('trims whitespace around the name', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Alice  ' });
    expect(res.body.assignee).toBe('Alice');
  });

  test('re-assigning replaces the previous assignee', async () => {
    const { body: task } = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('returns 404 for an unknown task', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/assign').send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for an empty string', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for a whitespace-only name', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is missing', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is not a string', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 123 });
    expect(res.status).toBe(400);
  });

  test('returns 400 for a name longer than 100 characters', async () => {
    const { body: task } = await createTask();
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'a'.repeat(101) });
    expect(res.status).toBe(400);
  });
});