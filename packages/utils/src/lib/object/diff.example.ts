/**
 * @fileoverview Examples demonstrating diffObject utilities with array index notation
 */

import {
  diffObject,
  diffObjectDetailed,
  hasObjectChanges,
  applyDiff,
  getChangedPaths,
} from './diff.js';

// ============================================================================
// Example 1: Basic Object Diff
// ============================================================================

const user1 = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
};

const user2 = {
  name: 'John Doe',
  age: 31,
  email: 'john.doe@example.com',
};

const basicDiff = diffObject(user1, user2);
console.log('Basic Diff:', basicDiff);
// Output: { age: 31, email: 'john.doe@example.com' }

// ============================================================================
// Example 2: Nested Object Diff
// ============================================================================

const config1 = {
  app: {
    name: 'MyApp',
    version: '1.0.0',
    settings: {
      theme: 'dark',
      language: 'en',
    },
  },
  database: {
    host: 'localhost',
    port: 5432,
  },
};

const config2 = {
  app: {
    name: 'MyApp',
    version: '1.0.1',
    settings: {
      theme: 'light',
      language: 'en',
    },
  },
  database: {
    host: 'localhost',
    port: 5432,
  },
};

const nestedDiff = diffObject(config1, config2);
console.log('Nested Diff:', nestedDiff);
// Output: { app: { version: '1.0.1', settings: { theme: 'light' } } }

// ============================================================================
// Example 3: Array with Objects - Array Index Notation
// ============================================================================

const state1 = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Charlie', role: 'user', active: false },
  ],
  timestamp: '2024-01-01',
};

const state2 = {
  users: [
    { id: 1, name: 'Alice', role: 'super-admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: false },
    { id: 3, name: 'Charlie', role: 'user', active: false },
  ],
  timestamp: '2024-01-02',
};

const arrayDiff = diffObject(state1, state2);
console.log('Array Diff:', arrayDiff);
// Output: { users: [...], timestamp: '2024-01-02' }

// ============================================================================
// Example 4: Detailed Diff with Array Indices
// ============================================================================

const detailed = diffObjectDetailed(state1, state2);
console.log('Detailed Diff:');
console.log('  Changes:', detailed.changes);
console.log('  Added:', detailed.added);
console.log('  Deleted:', detailed.deleted);
console.log('  Modified:', detailed.modified);
// Modified includes: ['users[0].role', 'users[1].active', 'timestamp']
console.log('  Has Changes:', detailed.hasChanges);

// ============================================================================
// Example 5: Get Changed Paths with Array Index Notation
// ============================================================================

const paths = getChangedPaths(state1, state2);
console.log('Changed Paths:', paths);
// Output: ['users[0].role', 'users[1].active', 'timestamp']

// ============================================================================
// Example 6: Complex Nested Arrays
// ============================================================================

const data1 = {
  departments: [
    {
      name: 'Engineering',
      teams: [
        { name: 'Frontend', members: ['Alice', 'Bob'] },
        { name: 'Backend', members: ['Charlie', 'Dave'] },
      ],
    },
    {
      name: 'Marketing',
      teams: [{ name: 'Content', members: ['Eve', 'Frank'] }],
    },
  ],
};

const data2 = {
  departments: [
    {
      name: 'Engineering',
      teams: [
        { name: 'Frontend', members: ['Alice', 'Bob', 'Grace'] },
        { name: 'Backend', members: ['Charlie', 'Dave'] },
      ],
    },
    {
      name: 'Marketing',
      teams: [{ name: 'Content', members: ['Eve', 'Helen'] }],
    },
  ],
};

const complexPaths = getChangedPaths(data1, data2);
console.log('Complex Changed Paths:', complexPaths);
// Output: [
//   'departments[0].teams[0].members[2]',
//   'departments[1].teams[0].members[1]'
// ]

// ============================================================================
// Example 7: Applying Diff
// ============================================================================

const original = {
  settings: {
    theme: 'dark',
    fontSize: 14,
    autoSave: true,
  },
  user: {
    name: 'John',
    preferences: ['compact', 'notifications'],
  },
};

const diff = {
  settings: {
    theme: 'light',
    fontSize: 16,
  },
  user: {
    preferences: ['compact', 'no-notifications', 'privacy'],
  },
};

const applied = applyDiff(original, diff as any);
console.log('Applied Diff:', applied);
// Output: {
//   settings: { theme: 'light', fontSize: 16, autoSave: true },
//   user: { name: 'John', preferences: ['compact', 'no-notifications', 'privacy'] }
// }

// ============================================================================
// Example 8: Handling Deletions
// ============================================================================

const doc1 = {
  title: 'Document',
  author: 'John Doe',
  tags: ['important', 'draft'],
  metadata: {
    created: '2024-01-01',
    updated: '2024-01-05',
  },
};

const doc2 = {
  title: 'Document',
  author: 'John Doe',
  tags: ['important'],
  metadata: {
    created: '2024-01-01',
  },
};

const diffWithDeletions = diffObject(doc1, doc2, { includeDeleted: true });
console.log('Diff with Deletions:', diffWithDeletions);
// Output: { tags: [...], metadata: { updated: undefined } }

const detailedWithDeletions = diffObjectDetailed(doc1, doc2, {
  includeDeleted: true,
});
console.log('Deleted Paths:', detailedWithDeletions.deleted);
// Output: ['tags[1]', 'metadata.updated']

// ============================================================================
// Example 9: Check if Objects Have Changes
// ============================================================================

const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.log('obj1 vs obj2 has changes:', hasObjectChanges(obj1, obj2)); // false
console.log('obj1 vs obj3 has changes:', hasObjectChanges(obj1, obj3)); // true

// ============================================================================
// Example 10: Custom Equality Function
// ============================================================================

const numbers1 = { value: 1.0000001, name: 'test' };
const numbers2 = { value: 1.0000002, name: 'test' };

// Default equality (strict)
const strictDiff = diffObject(numbers1, numbers2);
console.log('Strict Diff:', strictDiff);
// Output: { value: 1.0000002 }

// Custom approximate equality
const approxEqual = (a: any, b: any) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.0001;
  }
  return a === b;
};

const approxDiff = diffObject(numbers1, numbers2, { equalityFn: approxEqual });
console.log('Approximate Diff:', approxDiff);
// Output: {}

// ============================================================================
// Example 11: Real-world State Management Example
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  preferences: {
    theme: string;
    notifications: boolean;
  };
}

interface AppState {
  currentUser: User;
  recentItems: Array<{ id: string; title: string; timestamp: string }>;
  settings: {
    language: string;
    timezone: string;
  };
}

const previousState: AppState = {
  currentUser: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
  recentItems: [
    { id: '1', title: 'Document 1', timestamp: '2024-01-01T10:00:00Z' },
    { id: '2', title: 'Document 2', timestamp: '2024-01-01T11:00:00Z' },
  ],
  settings: {
    language: 'en',
    timezone: 'UTC',
  },
};

const newState: AppState = {
  currentUser: {
    id: 1,
    name: 'Alice',
    email: 'alice.smith@example.com',
    preferences: {
      theme: 'light',
      notifications: true,
    },
  },
  recentItems: [
    { id: '1', title: 'Document 1', timestamp: '2024-01-01T10:00:00Z' },
    {
      id: '2',
      title: 'Document 2 - Updated',
      timestamp: '2024-01-02T11:00:00Z',
    },
    { id: '3', title: 'Document 3', timestamp: '2024-01-02T12:00:00Z' },
  ],
  settings: {
    language: 'en',
    timezone: 'America/New_York',
  },
};

// Get what changed for state tracking/debugging
const stateChanges = diffObject(previousState, newState);
console.log('\nState Changes:', JSON.stringify(stateChanges, null, 2));

// Get detailed paths for logging or analytics
const changedPaths = getChangedPaths(previousState, newState);
console.log('\nChanged State Paths:');
changedPaths.forEach((path) => console.log(`  - ${path}`));
// Output:
//   - currentUser.email
//   - currentUser.preferences.theme
//   - recentItems[1].title
//   - recentItems[1].timestamp
//   - recentItems[2]
//   - settings.timezone

// Check if we need to persist changes
if (hasObjectChanges(previousState, newState)) {
  console.log('\nState has changed - persisting to storage...');
  // Only send the changes to the server, not the entire state
  // This can significantly reduce bandwidth for large state objects
}

// Get detailed information for debugging
const stateDetails = diffObjectDetailed(previousState, newState);
console.log('\nState Update Summary:');
console.log(
  `  Total Changes: ${stateDetails.modified.length + stateDetails.added.length}`
);
console.log(`  Modified Paths: ${stateDetails.modified.length}`);
console.log(`  Added Paths: ${stateDetails.added.length}`);
console.log(`  Deleted Paths: ${stateDetails.deleted.length}`);

export {
  basicDiff,
  nestedDiff,
  arrayDiff,
  detailed,
  paths,
  complexPaths,
  applied,
  diffWithDeletions,
  detailedWithDeletions,
  stateChanges,
  changedPaths,
  stateDetails,
};
