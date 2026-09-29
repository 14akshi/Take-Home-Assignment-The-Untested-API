const taskService = require('../src/services/taskService');

// Start every test with an empty task list
beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('applies defaults when only a title is given', () => {
    const task = taskService.create({ title: 'Write tests' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('uses the values it is given', () => {
    const task = taskService.create({ title: 'A', priority: 'high', status: 'in_progress' });
    expect(task.priority).toBe('high');
    expect(task.status).toBe('in_progress');
  });
});

describe('getAll / findById', () => {
  test('getAll returns a copy, so changing it does not change the store', () => {
    taskService.create({ title: 'A' });
    const list = taskService.getAll();
    list.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('findById returns the task, or undefined if missing', () => {
    const task = taskService.create({ title: 'A' });
    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'in_progress' });
  });

  test('returns only tasks with that exact status', () => {
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  test('returns an empty list for an unknown status', () => {
    expect(taskService.getByStatus('banana')).toEqual([]);
  });

  // BUG 2: uses .includes(), so a partial word matches
  test('does not match partial status text ("do" must not match todo/done)', () => {
    expect(taskService.getByStatus('do')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    ['T1', 'T2', 'T3', 'T4', 'T5'].forEach((title) => taskService.create({ title }));
  });

  // BUG 1: offset is page * limit, so page 1 skips the first items
  test('page 1 returns the first items', () => {
    const titles = taskService.getPaginated(1, 2).map((t) => t.title);
    expect(titles).toEqual(['T1', 'T2']);
  });

  test('page 2 returns the next items', () => {
    const titles = taskService.getPaginated(2, 2).map((t) => t.title);
    expect(titles).toEqual(['T3', 'T4']);
  });

  test('last page can be partly filled', () => {
    const titles = taskService.getPaginated(3, 2).map((t) => t.title);
    expect(titles).toEqual(['T5']);
  });

  test('a page past the end returns an empty list', () => {
    expect(taskService.getPaginated(10, 2)).toEqual([]);
  });
});

describe('getStats', () => {
  test('counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });
    expect(taskService.getStats()).toMatchObject({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
  });

  test('counts overdue tasks, but not done or future ones', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    taskService.create({ title: 'late', dueDate: past });
    taskService.create({ title: 'late but done', status: 'done', dueDate: past });
    taskService.create({ title: 'not due yet', dueDate: future });
    expect(taskService.getStats().overdue).toBe(1);
  });
});

describe('update', () => {
  test('changes the given fields and keeps the rest', () => {
    const task = taskService.create({ title: 'Old', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'New' });
    expect(updated.title).toBe('New');
    expect(updated.priority).toBe('low');
    expect(updated.id).toBe(task.id);
  });

  test('returns null for an unknown id', () => {
    expect(taskService.update('nope', { title: 'X' })).toBeNull();
  });
});

describe('remove', () => {
  test('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'A' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false for an unknown id', () => {
    expect(taskService.remove('nope')).toBe(false);
  });
});

describe('completeTask', () => {
  test('sets status to done and fills in completedAt', () => {
    const task = taskService.create({ title: 'A' });
    const done = taskService.completeTask(task.id);
    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
  });

  // BUG 3: completeTask overwrites priority with 'medium'
  test('keeps the original priority', () => {
    const task = taskService.create({ title: 'A', priority: 'high' });
    expect(taskService.completeTask(task.id).priority).toBe('high');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });
});