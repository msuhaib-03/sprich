import { Module } from '@nestjs/common'
import { ProgressController } from './progress.controller'
import { ProgressService } from './progress.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [AiModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
