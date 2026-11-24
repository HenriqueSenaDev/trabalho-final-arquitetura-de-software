/** Testes de unidade e de arquitetura: rodam sem banco. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unidade'],
  testRegex: '\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.check.json' }] },
};
