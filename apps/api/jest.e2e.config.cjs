/** Testes de ponta a ponta: exigem o PostgreSQL do docker compose de pé. */
module.exports = {
  testEnvironment: 'node',
  testRegex: '.*\\.e2e-spec\\.ts$',
  testTimeout: 60_000,
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
};
