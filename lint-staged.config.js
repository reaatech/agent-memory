/**
 * @type {import('lint-staged').Config}
 */
export default {
  '**/*.{ts,js}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
