import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CancelReminderUseCase } from '../application/cancel-reminder.use-case';
import { ListRemindersUseCase } from '../application/list-reminders.use-case';
import { ScheduleReminderUseCase } from '../application/schedule-reminder.use-case';
import { ReminderProps } from '../domain/reminder';
import { ScheduleReminderDto } from './schedule-reminder.dto';

@Controller('holders/:holderId/reminders')
export class RemindersController {
  constructor(
    private readonly scheduleReminder: ScheduleReminderUseCase,
    private readonly cancelReminder: CancelReminderUseCase,
    private readonly listReminders: ListRemindersUseCase,
  ) {}

  @Post()
  schedule(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Body() body: ScheduleReminderDto,
  ): Promise<ReminderProps> {
    return this.scheduleReminder.execute({ holderId, ...body });
  }

  @Get()
  list(
    @Param('holderId', ParseUUIDPipe) holderId: string,
  ): Promise<ReminderProps[]> {
    return this.listReminders.execute({ holderId });
  }

  @Patch(':reminderId/cancel')
  cancel(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ): Promise<ReminderProps> {
    return this.cancelReminder.execute({ holderId, reminderId });
  }
}
