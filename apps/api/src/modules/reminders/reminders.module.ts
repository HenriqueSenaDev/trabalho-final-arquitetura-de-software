import { Module } from '@nestjs/common';
import { CancelConsultationReminderUseCase } from './application/cancel-consultation-reminder.use-case';
import { CancelReminderUseCase } from './application/cancel-reminder.use-case';
import { GetConsultationReminderUseCase } from './application/get-consultation-reminder.use-case';
import { ListRemindersUseCase } from './application/list-reminders.use-case';
import { ScheduleConsultationReminderUseCase } from './application/schedule-consultation-reminder.use-case';
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
    {
      provide: ScheduleConsultationReminderUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new ScheduleConsultationReminderUseCase(repo),
    },
    {
      provide: CancelConsultationReminderUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new CancelConsultationReminderUseCase(repo),
    },
    {
      provide: GetConsultationReminderUseCase,
      inject: [ReminderRepository],
      useFactory: (repo: ReminderRepository) => new GetConsultationReminderUseCase(repo),
    },
  ],
  // Usados pelo health-records para o aviso da consulta, na mesma transação.
  exports: [
    ScheduleConsultationReminderUseCase,
    CancelConsultationReminderUseCase,
    GetConsultationReminderUseCase,
  ],
})
export class RemindersModule {}
