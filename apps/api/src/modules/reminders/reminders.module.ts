import { Module } from '@nestjs/common';
import { CancelReminderUseCase } from './application/cancel-reminder.use-case';
import { ListRemindersUseCase } from './application/list-reminders.use-case';
import { ScheduleReminderUseCase } from './application/schedule-reminder.use-case';
import { ReminderRepository } from './domain/reminder.repository';
import { PrismaReminderRepository } from './infrastructure/prisma-reminder.repository';
import { RemindersController } from './presentation/reminders.controller';

@Module({
  controllers: [RemindersController],
  providers: [
    { provide: ReminderRepository, useClass: PrismaReminderRepository },
    {
      provide: ScheduleReminderUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new ScheduleReminderUseCase(repo),
    },
    {
      provide: CancelReminderUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new CancelReminderUseCase(repo),
    },
    {
      provide: ListRemindersUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new ListRemindersUseCase(repo),
    },
  ],
})
export class RemindersModule {}
