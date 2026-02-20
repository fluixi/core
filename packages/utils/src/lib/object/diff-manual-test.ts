/**
 * Manual test to verify diffObjectDetailed correctly categorizes paths
 * Run this to check the implementation
 */

import {
  diffObjectDetailed,
  getChangedPaths,
} from './diff.js';

console.log('='.repeat(60));
console.log('Manual Test for diffObjectDetailed');
console.log('='.repeat(60));

// Test 1: Added array element
console.log('\n--- Test 1: Added array element ---');
const test1Old = { items: [{ name: 'a' }] };
const test1New = { items: [{ name: 'a' }, { name: 'b' }] };
const test1Result = diffObjectDetailed(test1Old, test1New);
console.log('Added:', test1Result.added);
console.log('Modified:', test1Result.modified);
console.log('Deleted:', test1Result.deleted);
console.log('Expected added to contain: items[1]');
console.log('✓ Pass:', test1Result.added.includes('items[1]'));

// Test 2: Deleted array element
console.log('\n--- Test 2: Deleted array element ---');
const test2Old = { items: [{ name: 'a' }, { name: 'b' }] };
const test2New = { items: [{ name: 'a' }] };
const test2Result = diffObjectDetailed(test2Old, test2New, { includeDeleted: true });
console.log('Added:', test2Result.added);
console.log('Modified:', test2Result.modified);
console.log('Deleted:', test2Result.deleted);
console.log('Expected deleted to contain: items[1]');
console.log('✓ Pass:', test2Result.deleted.includes('items[1]'));

// Test 3: Modified array elements
console.log('\n--- Test 3: Modified array elements ---');
const test3Old = {
  items: [
    { id: 1, name: 'a', active: true },
    { id: 2, name: 'b', active: false },
  ],
};
const test3New = {
  items: [
    { id: 1, name: 'x', active: true },
    { id: 2, name: 'y', active: true },
  ],
};
const test3Result = diffObjectDetailed(test3Old, test3New);
console.log('Added:', test3Result.added);
console.log('Modified:', test3Result.modified);
console.log('Deleted:', test3Result.deleted);
console.log('Expected modified to contain: items[0].name, items[1].name, items[1].active');
console.log('✓ items[0].name:', test3Result.modified.includes('items[0].name'));
console.log('✓ items[1].name:', test3Result.modified.includes('items[1].name'));
console.log('✓ items[1].active:', test3Result.modified.includes('items[1].active'));

// Test 4: Complex nested changes
console.log('\n--- Test 4: Complex nested changes ---');
const test4Old = {
  users: [
    { id: 1, name: 'John', age: 30, tags: ['admin', 'user'] },
    { id: 2, name: 'Jane', age: 25, tags: ['user'] },
    { id: 3, name: 'Bob', age: 35, tags: ['moderator'] },
  ],
  metadata: {
    count: 3,
    lastUpdate: '2024-01-01',
  },
};

const test4New = {
  users: [
    { id: 1, name: 'John', age: 31, tags: ['admin', 'user'] },
    { id: 2, name: 'Jane', age: 25, tags: ['editor'] },
    { id: 3, name: 'Bob', age: 35, tags: ['moderator'] },
    { id: 4, name: 'Alice', age: 28, tags: ['user'] },
  ],
  metadata: {
    count: 4,
    lastUpdate: '2024-01-02',
  },
};

const test4Result = diffObjectDetailed(test4Old, test4New);
console.log('Added:', test4Result.added);
console.log('Modified:', test4Result.modified);
console.log('Deleted:', test4Result.deleted);
console.log('Expected:');
console.log('  - modified: users[0].age');
console.log('  - modified: users[1].tags[0]');
console.log('  - modified: metadata.count');
console.log('  - modified: metadata.lastUpdate');
console.log('  - added: users[3]');
console.log('Results:');
console.log('✓ users[0].age:', test4Result.modified.includes('users[0].age'));
console.log('✓ users[1].tags[0]:', test4Result.modified.includes('users[1].tags[0]'));
console.log('✓ metadata.count:', test4Result.modified.includes('metadata.count'));
console.log('✓ metadata.lastUpdate:', test4Result.modified.includes('metadata.lastUpdate'));
console.log('✓ users[3]:', test4Result.added.includes('users[3]'));

// Test 5: getChangedPaths should match
console.log('\n--- Test 5: getChangedPaths comparison ---');
const test5Paths = getChangedPaths(test4Old, test4New);
console.log('Changed paths:', test5Paths);
console.log('All paths from detailed:');
const allDetailedPaths = [
  ...test4Result.added,
  ...test4Result.modified,
  ...test4Result.deleted,
];
console.log(allDetailedPaths);

console.log('\n' + '='.repeat(60));
console.log('Manual Test Complete');
console.log('='.repeat(60));
