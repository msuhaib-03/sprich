import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { LessonsModule } from './lessons/lessons.module'
import { VocabularyModule } from './vocabulary/vocabulary.module'
import { SpeakingModule } from './speaking/speaking.module'
import { ProgressModule } from './progress/progress.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { AiModule } from './ai/ai.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LessonsModule,
    VocabularyModule,
    SpeakingModule,
    ProgressModule,
    SubscriptionsModule,
    AiModule,
  ],
})
export class AppModule {}
