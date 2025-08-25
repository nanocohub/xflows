#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync } = require('fs');

console.log('🔍 Running pre-package checks...');

// Check if TypeScript is available
if (!existsSync('./tsconfig.json')) {
  console.error('❌ tsconfig.json not found');
  process.exit(1);
}

try {
  // Type checking
  console.log('📋 Running TypeScript type check...');
  execSync('pnpm run typecheck', { stdio: 'inherit' });
  console.log('✅ Type check passed');
} catch (error) {
  console.error('❌ Type check failed');
  process.exit(1);
}

try {
  // ESLint
  console.log('🔍 Running ESLint...');
  execSync('pnpm run lint', { stdio: 'inherit' });
  console.log('✅ Linting passed');
} catch (error) {
  console.error('❌ Linting failed');
  process.exit(1);
}

console.log('🎉 All pre-package checks passed!');