import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthController } from './infrastructure/http/health.controller';
import { AccountsModule } from './modules/accounts/accounts.module';
import { HealthRecordsModule } from './modules/health-records/health-records.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AccountsModule,
    HealthRecordsModule,
    IndicatorsModule,
    RemindersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
