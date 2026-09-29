const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const createTask = (body = { title: 'Test task' }) => request(app).post('/tasks').send(body);

describe('POST /tasks', () => {
  test('creates a task with defaults and returns 201', async () => {
    const res = await createTask({ title: 'Write tests' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Write tests',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await createTask({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test('returns 400 when title is only spaces', async () => {
    const res = await createTask({ title: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for an invalid status', async () => {
    const res = await createTask({ title: 'A', status: 'banana' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
  });

  test('returns 400 for an invalid priority', async () => {
    const res = await createTask({ title: 'A', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/);
  });

  test('returns 400 for an invalid dueDate', async () => {
    const res = await createTask({ title: 'A', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/);
  });

  // BUG 6: the error handler turns a client error into a 500
  test('returns 400 for malformed JSON', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
    spy.mockRestore();
  });
});

describe('GET /tasks', () => {
  test('returns an empty list when there are no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(2);
  });

  test('filters by status', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('B');
  });

  test('paginates: page 1 returns the first items', async () => {
    for (const t of ['T1', 'T2', 'T3']) await createTask({ title: t });
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.body.map((t) => t.title)).toEqual(['T1', 'T2']);
  });

  test('paginates: page 2 returns the rest', async () => {
    for (const t of ['T1', 'T2', 'T3']) await createTask({ title: t });
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.body.map((t) => t.title)).toEqual(['T3']);
  });

  // BUG 5: the route returns early on `status`, so pagination is ignored
  test('status filter and pagination work together', async () => {
    for (const t of ['T1', 'T2', 'T3']) await createTask({ title: t, status: 'todo' });
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts by status plus overdue', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    await createTask({ title: 'A', status: 'todo', dueDate: past });
    await createTask({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 0, done: 1, overdue: 1 });
  });
});

describe('PUT /tasks/:id', () => {
  test('updates a task', async () => {
    const { body: task } = await createTask({ title: 'Old' });
    const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'New', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe('high');
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for an invalid status', async () => {
    const { body: task } = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'banana' });
    expect(res.status).toBe(400);
  });

  // BUG 4: the update accepts any field, including id
  test('does not let the client change the id', async () => {
    const { body: task } = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ id: 'hacked' });
    expect(res.body.id).toBe(task.id);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes a task and returns 204', async () => {
    const { body: task } = await createTask();
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks the task done and sets completedAt', async () => {
    const { body: task } = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });
});