/** Fluxo principal de ponta a ponta: exige o PostgreSQL do docker compose. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testRegex: '\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.check.json' }] },
};
