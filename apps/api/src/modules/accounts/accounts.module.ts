import { Module } from '@nestjs/common';
import { GetHolderUseCase } from './application/get-holder.use-case';
import { ListSessionsUseCase } from './application/list-sessions.use-case';
import { LoginUseCase } from './application/login.use-case';
import { PasswordHasher } from './application/password-hasher.port';
import { RegisterHolderUseCase } from './application/register-holder.use-case';
import { RevokeSessionUseCase } from './application/revoke-session.use-case';
import { ValidateSessionUseCase } from './application/validate-session.use-case';
import { HolderRepository } from './domain/holder.repository';
import { SessionRepository } from './domain/session.repository';
import { PrismaHolderRepository } from './infrastructure/prisma-holder.repository';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { HoldersController } from './presentation/holders.controller';
import { SessionsController } from './presentation/sessions.controller';

@Module({
  controllers: [HoldersController, SessionsController],
  providers: [
    { provide: HolderRepository, useClass: PrismaHolderRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
    {
      provide: RegisterHolderUseCase,
      inject: [HolderRepository, PasswordHasher],
      useFactory: (repo: HolderRepository, hasher: PasswordHasher) =>
        new RegisterHolderUseCase(repo, hasher),
    },
    {
      provide: GetHolderUseCase,
      inject: [HolderRepository],
      useFactory: (repo: HolderRepository) => new GetHolderUseCase(repo),
    },
    {
      provide: LoginUseCase,
      inject: [HolderRepository, SessionRepository, PasswordHasher],
      useFactory: (holders: HolderRepository, sessions: SessionRepository, hasher: PasswordHasher) =>
        new LoginUseCase(holders, sessions, hasher),
    },
    {
      provide: ValidateSessionUseCase,
      inject: [SessionRepository],
      useFactory: (sessions: SessionRepository) => new ValidateSessionUseCase(sessions),
    },
    {
      provide: ListSessionsUseCase,
      inject: [SessionRepository],
      useFactory: (sessions: SessionRepository) => new ListSessionsUseCase(sessions),
    },
    {
      provide: RevokeSessionUseCase,
      inject: [SessionRepository],
      useFactory: (sessions: SessionRepository) => new RevokeSessionUseCase(sessions),
    },
  ],
  // A guarda de sessão (infrastructure/http) valida o token por este caso de uso.
  exports: [ValidateSessionUseCase],
})
export class AccountsModule {}
