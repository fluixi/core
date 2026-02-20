// /**
//  * @fileoverview Examples demonstrating deepMerge with no reference issues
//  * @description Shows how deepMerge properly clones objects and prevents reference leaking
//  */

// import { deepMerge } from './merge.js';

// console.log('='.repeat(70));
// console.log('deepMerge Examples - No Reference Issues');
// console.log('='.repeat(70));

// // ============================================================================
// // Example 1: Basic Object Merging
// // ============================================================================

// console.log('\n--- Example 1: Basic Object Merging ---');

// const config1 = { host: 'localhost', port: 3000 };
// const config2 = { port: 8080, ssl: true };
// const mergedConfig = deepMerge(config1, config2);

// console.log('Config 1:', config1);
// console.log('Config 2:', config2);
// console.log('Merged:', mergedConfig);
// // Output: { host: 'localhost', port: 8080, ssl: true }

// // ============================================================================
// // Example 2: No Reference Issues - Nested Objects
// // ============================================================================

// console.log('\n--- Example 2: No Reference Issues (Critical!) ---');

// const original = {
//   user: {
//     name: 'John',
//     settings: { theme: 'dark' }
//   }
// };
// const updates = { user: { settings: { notifications: true } } };
// const result = deepMerge(original, updates);

// console.log('Before modification:');
// console.log('Original:', JSON.stringify(original, null, 2));
// console.log('Result:', JSON.stringify(result, null, 2));

// // Modify original - result should NOT be affected
// original.user.name = 'CHANGED';
// original.user.settings.theme = 'CHANGED';

// console.log('\nAfter modifying original:');
// console.log('Original user.name:', original.user.name);
// console.log('Result user.name:', result.user.name);
// console.log('✅ Result unchanged - no references kept!');

// // ============================================================================
// // Example 3: Array Merging Without Reference Issues
// // ============================================================================

// console.log('\n--- Example 3: Array Merging (No References) ---');

// const list1 = { items: [{ id: 1, name: 'Item 1' }] };
// const list2 = { items: [{ id: 2, name: 'Item 2' }] };
// const mergedList = deepMerge(list1, list2);

// console.log('Before modification:');
// console.log('Merged items:', mergedList.items);

// // Modify source arrays
// list1.items[0].name = 'MODIFIED';
// list2.items[0].name = 'MODIFIED';

// console.log('\nAfter modifying sources:');
// console.log('List1 item[0]:', list1.items[0].name);
// console.log('Merged item[0]:', mergedList.items[0].name);
// console.log('Merged item[1]:', mergedList.items[1].name);
// console.log('✅ Merged array elements unchanged!');

// // ============================================================================
// // Example 4: Configuration Merging
// // ============================================================================

// console.log('\n--- Example 4: Configuration Merging ---');

// const defaultConfig = {
//   server: {
//     host: 'localhost',
//     port: 3000,
//     timeout: 30000,
//     ssl: false,
//   },
//   database: {
//     host: 'localhost',
//     port: 5432,
//     poolSize: 10,
//   },
//   logging: {
//     level: 'info',
//     format: 'json',
//   },
// };

// const productionConfig = {
//   server: {
//     host: 'prod.example.com',
//     port: 443,
//     ssl: true,
//   },
//   database: {
//     host: 'db.example.com',
//     poolSize: 50,
//   },
//   logging: {
//     level: 'error',
//   },
// };

// const finalConfig = deepMerge(defaultConfig, productionConfig);

// console.log('Final Config:');
// console.log(JSON.stringify(finalConfig, null, 2));

// // Verify no references
// defaultConfig.server.port = 9999;
// console.log('\nAfter changing default port to 9999:');
// console.log('Default port:', defaultConfig.server.port);
// console.log('Final config port:', finalConfig.server.port);
// console.log('✅ Final config unaffected!');

// // ============================================================================
// // Example 5: State Management
// // ============================================================================

// console.log('\n--- Example 5: State Management ---');

// const initialState = {
//   user: {
//     id: 1,
//     name: 'Alice',
//     profile: {
//       avatar: 'avatar1.png',
//       bio: 'Developer',
//     },
//   },
//   preferences: {
//     theme: 'dark',
//     language: 'en',
//   },
//   cache: [
//     { key: 'data1', value: 'cached1' },
//     { key: 'data2', value: 'cached2' },
//   ],
// };

// const stateUpdate = {
//   user: {
//     profile: {
//       avatar: 'avatar2.png',
//     },
//   },
//   preferences: {
//     theme: 'light',
//   },
//   cache: [
//     { key: 'data3', value: 'cached3' },
//   ],
// };

// const newState = deepMerge(initialState, stateUpdate);

// console.log('New State:');
// console.log(JSON.stringify(newState, null, 2));

// // Test immutability
// initialState.user.name = 'MUTATED';
// initialState.cache[0].value = 'MUTATED';

// console.log('\nAfter mutating initial state:');
// console.log('Initial user name:', initialState.user.name);
// console.log('New state user name:', newState.user.name);
// console.log('Initial cache[0]:', initialState.cache[0].value);
// console.log('New state cache[0]:', newState.cache[0].value);
// console.log('✅ New state is immutable!');

// // ============================================================================
// // Example 6: Multiple Object Merging
// // ============================================================================

// console.log('\n--- Example 6: Multiple Object Merging ---');

// const base = { a: 1, b: { c: 2 } };
// const layer1 = { b: { d: 3 }, e: 4 };
// const layer2 = { b: { e: 5 }, f: 6 };
// const layer3 = { g: 7 };

// const layered = deepMerge(base, layer1, layer2, layer3);

// console.log('Layered merge result:');
// console.log(JSON.stringify(layered, null, 2));
// // Output: { a: 1, b: { c: 2, d: 3, e: 5 }, e: 4, f: 6, g: 7 }

// // ============================================================================
// // Example 7: Default Options Pattern
// // ============================================================================

// console.log('\n--- Example 7: Default Options Pattern ---');

// function createWidget(userOptions: any = {}) {
//   const defaults = {
//     width: 300,
//     height: 200,
//     style: {
//       background: 'white',
//       border: '1px solid black',
//       padding: 10,
//     },
//     features: {
//       draggable: false,
//       resizable: false,
//     },
//   };

//   return deepMerge(defaults, userOptions);
// }

// const widget1 = createWidget();
// const widget2 = createWidget({
//   width: 500,
//   style: { background: 'blue' },
//   features: { draggable: true },
// });

// console.log('Widget 1 (defaults):', JSON.stringify(widget1, null, 2));
// console.log('Widget 2 (custom):', JSON.stringify(widget2, null, 2));

// // ============================================================================
// // Example 8: Form Data Merging
// // ============================================================================

// console.log('\n--- Example 8: Form Data Merging ---');

// const savedFormData = {
//   personal: {
//     firstName: 'John',
//     lastName: 'Doe',
//   },
//   address: {
//     street: '123 Main St',
//     city: 'NYC',
//     zip: '10001',
//   },
//   contacts: [
//     { type: 'email', value: 'john@example.com' },
//   ],
// };

// const userEdits = {
//   personal: {
//     firstName: 'Jonathan',
//   },
//   address: {
//     city: 'Los Angeles',
//     zip: '90001',
//   },
//   contacts: [
//     { type: 'phone', value: '555-1234' },
//   ],
// };

// const updatedForm = deepMerge(savedFormData, userEdits);

// console.log('Updated form:');
// console.log(JSON.stringify(updatedForm, null, 2));

// // ============================================================================
// // Example 9: API Response Merging
// // ============================================================================

// console.log('\n--- Example 9: API Response Merging ---');

// const cachedData = {
//   user: {
//     id: 1,
//     name: 'Alice',
//     lastFetch: '2024-01-01',
//   },
//   posts: [
//     { id: 1, title: 'First Post', cached: true },
//   ],
// };

// const freshData = {
//   user: {
//     name: 'Alice Smith',
//     lastFetch: '2024-01-02',
//   },
//   posts: [
//     { id: 2, title: 'Second Post', cached: false },
//   ],
// };

// const combinedData = deepMerge(cachedData, freshData);

// console.log('Combined API data:');
// console.log(JSON.stringify(combinedData, null, 2));

// // ============================================================================
// // Example 10: Theme Inheritance
// // ============================================================================

// console.log('\n--- Example 10: Theme Inheritance ---');

// const baseTheme = {
//   colors: {
//     primary: '#007bff',
//     secondary: '#6c757d',
//     success: '#28a745',
//     danger: '#dc3545',
//   },
//   spacing: {
//     small: 8,
//     medium: 16,
//     large: 24,
//   },
//   typography: {
//     fontFamily: 'Arial, sans-serif',
//     fontSize: {
//       small: 12,
//       medium: 14,
//       large: 18,
//     },
//   },
// };

// const darkTheme = {
//   colors: {
//     primary: '#0d6efd',
//     background: '#212529',
//     text: '#f8f9fa',
//   },
//   typography: {
//     fontSize: {
//       small: 14,
//     },
//   },
// };

// const customTheme = deepMerge(baseTheme, darkTheme);

// console.log('Custom theme:');
// console.log(JSON.stringify(customTheme, null, 2));

// // Test immutability
// baseTheme.colors.primary = '#000000';
// console.log('\nAfter changing base theme primary color:');
// console.log('Base theme primary:', baseTheme.colors.primary);
// console.log('Custom theme primary:', customTheme.colors.primary);
// console.log('✅ Custom theme unaffected!');

// // ============================================================================
// // Example 11: Middleware Configuration
// // ============================================================================

// console.log('\n--- Example 11: Middleware Configuration ---');

// const defaultMiddleware = {
//   cors: {
//     enabled: true,
//     origin: '*',
//   },
//   compression: {
//     enabled: true,
//     threshold: 1024,
//   },
//   rateLimit: {
//     enabled: false,
//     max: 100,
//     windowMs: 900000,
//   },
// };

// const customMiddleware = {
//   cors: {
//     origin: 'https://example.com',
//     credentials: true,
//   },
//   rateLimit: {
//     enabled: true,
//     max: 50,
//   },
// };

// const middlewareConfig = deepMerge(defaultMiddleware, customMiddleware);

// console.log('Middleware config:');
// console.log(JSON.stringify(middlewareConfig, null, 2));

// console.log('\n' + '='.repeat(70));
// console.log('All Examples Complete!');
// console.log('Key Takeaway: deepMerge creates completely independent objects');
// console.log('='.repeat(70));

// export {
//   mergedConfig,
//   result,
//   mergedList,
//   finalConfig,
//   newState,
//   layered,
//   widget1,
//   widget2,
//   updatedForm,
//   combinedData,
//   customTheme,
//   middlewareConfig,
// };
