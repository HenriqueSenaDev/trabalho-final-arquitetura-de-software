import { Module } from '@nestjs/common';
import { GetHolderUseCase } from './application/get-holder.use-case';
import { PasswordHasher } from './application/password-hasher.port';
import { RegisterHolderUseCase } from './application/register-holder.use-case';
import { HolderRepository } from './domain/holder.repository';
import { PrismaHolderRepository } from './infrastructure/prisma-holder.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { HoldersController } from './presentation/holders.controller';

@Module({
  controllers: [HoldersController],
  providers: [
    { provide: HolderRepository, useClass: PrismaHolderRepository },
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
  ],
})
export class AccountsModule {}
