// Run: npm test
import assert from 'node:assert/strict';
import { ApiError, isClientError, isNotFound } from './api';

// The retry predicate wired into the QueryClient in main.tsx.
const retry = (count: number, error: unknown) => count < 1 && !isClientError(error);

const notFound = new ApiError("Project 'x' not found", 404);
const badRequest = new ApiError('page_size must be one of 25, 50, 100, 200', 400);
const unprocessable = new ApiError('Input should be 25, 50, 100 or 200', 422);
const serverError = new ApiError('Error fetching logs: lost connection', 500);
const offline = new TypeError('Failed to fetch'); // fetch() rejected: no response at all

// The message still reaches the UI, and the status rides along with it.
assert.equal(notFound.message, "Project 'x' not found");
assert.equal(notFound.status, 404);
assert.ok(notFound instanceof Error);

// 4xx is the server's final answer; 5xx and a dead network are worth one retry.
for (const e of [notFound, badRequest, unprocessable]) assert.equal(isClientError(e), true, String(e));
for (const e of [serverError, offline, undefined, null]) assert.equal(isClientError(e), false, String(e));

assert.equal(isNotFound(notFound), true);
for (const e of [badRequest, unprocessable, serverError, offline, null]) assert.equal(isNotFound(e), false, String(e));

// Retry: never a 4xx, once for anything else, then give up.
assert.equal(retry(0, notFound), false); // the mistyped-URL case: one request, not two
assert.equal(retry(0, badRequest), false);
assert.equal(retry(0, serverError), true);
assert.equal(retry(0, offline), true);
assert.equal(retry(1, serverError), false); // only one retry
assert.equal(retry(1, offline), false);

console.log('api ok');
