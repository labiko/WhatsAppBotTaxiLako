// Test simple pour "mardina marché" uniquement
import { testSearchInDatabaseSmart } from './test_functions_individual.ts';

console.log('🎯 TEST FOCUS: "mardina marché"');
console.log('==============================\n');

// Test avec vraie base Supabase
await testSearchInDatabaseSmart('mardina marché', 10, 'debug');