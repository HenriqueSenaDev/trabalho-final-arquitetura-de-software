import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HttpModule } from './infrastructure/http/http.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { HealthRecordsModule } from './modules/health-records/health-records.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { TimelineModule } from './modules/timeline/timeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HttpModule,
    AccountsModule,
    HealthRecordsModule,
    IndicatorsModule,
    RemindersModule,
    TimelineModule,
  ],
})
export class AppModule {}
