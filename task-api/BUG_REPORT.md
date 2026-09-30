\# Bug Report



Found by writing tests first (`npm test`). Bugs 1-6 each have a test; the tests for bugs 2-6 fail on purpose. \*\*Coverage: 96.79% statements\*\* (`npm run coverage`).



\## Bug 1 - Pagination skips the first page (FIXED)

\- \*\*Where:\*\* `src/services/taskService.js`, `getPaginated`

\- \*\*Expected:\*\* `?page=1\&limit=10` returns items 1-10.

\- \*\*Actual:\*\* it returned items 11-20, and the last page came back empty.

\- \*\*Why:\*\* `offset = page \* limit` treats pages as 0-based, but the route defaults to page 1.

\- \*\*Found by:\*\* the `getPaginated` unit tests (page 1 returned T3, T4 instead of T1, T2).

\- \*\*Fix:\*\* `offset = (page - 1) \* limit`. All pagination tests now pass.



\## Bug 2 - Status filter matches partial text

\- \*\*Where:\*\* `taskService.js`, `getByStatus`

\- \*\*Expected:\*\* `?status=do` returns nothing, since it is not a real status.

\- \*\*Actual:\*\* it returns both `todo` and `done` tasks.

\- \*\*Why:\*\* `t.status.includes(status)` is a substring match.

\- \*\*Found by:\*\* unit test with `getByStatus('do')`.

\- \*\*Fix:\*\* use `t.status === status`. The route could also reject unknown statuses with a 400.



\## Bug 3 - Completing a task resets its priority

\- \*\*Where:\*\* `taskService.js`, `completeTask`

\- \*\*Expected:\*\* only `status` and `completedAt` change.

\- \*\*Actual:\*\* `priority` is overwritten with `'medium'`, so a high-priority task loses its priority.

\- \*\*Why:\*\* the line `priority: 'medium'` inside the object built by `completeTask`.

\- \*\*Found by:\*\* unit test that completes a `high` task and gets `medium` back.

\- \*\*Fix:\*\* delete that line.



\## Bug 4 - PUT lets the client overwrite protected fields

\- \*\*Where:\*\* `taskService.js` `update` plus `validators.js` `validateUpdateTask`

\- \*\*Expected:\*\* `id`, `createdAt` and `completedAt` cannot be changed by the client.

\- \*\*Actual:\*\* `PUT /tasks/:id` with `{"id": "hacked"}` changes the task's id.

\- \*\*Why:\*\* `update` spreads the whole request body into the task, and the validator only checks four fields.

\- \*\*Found by:\*\* route test sending `{ id: 'hacked' }`.

\- \*\*Fix:\*\* whitelist the editable fields (title, description, status, priority, dueDate) in `update`.



\## Bug 5 - Status filter ignores pagination

\- \*\*Where:\*\* `src/routes/tasks.js`, `GET /`

\- \*\*Expected:\*\* `?status=todo\&page=1\&limit=2` returns 2 todo tasks.

\- \*\*Actual:\*\* it returns all 3, because the route returns early inside `if (status)`.

\- \*\*Why:\*\* filtering and pagination are separate branches instead of being chained.

\- \*\*Found by:\*\* route test with both parameters.

\- \*\*Fix:\*\* filter first, then paginate the filtered result.



\## Bug 6 - Malformed JSON returns 500 instead of 400

\- \*\*Where:\*\* `src/app.js`, the error-handling middleware

\- \*\*Expected:\*\* invalid JSON in the request body returns 400.

\- \*\*Actual:\*\* returns 500 "Internal server error".

\- \*\*Why:\*\* the handler answers every error with 500 and ignores `err.status`, which Express sets to 400 for parse errors.

\- \*\*Found by:\*\* route test sending broken JSON.

\- \*\*Fix:\*\* `res.status(err.status || 500)`, and don't log expected 4xx errors as crashes.



\## Other observations (not bugs I tested)

\- The README lists statuses as `pending | in-progress | completed`, but the code and ASSIGNMENT.md use `todo | in\_progress | done`. The README is wrong.

\- `limit` and `page` accept negative numbers and have no upper limit.

\- `PUT` can set `status: 'done'` without setting `completedAt`, so the data can become inconsistent.

\- `completeTask` on an already-completed task overwrites `completedAt`.

