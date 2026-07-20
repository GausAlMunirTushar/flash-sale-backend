import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityService } from './activity.service';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
