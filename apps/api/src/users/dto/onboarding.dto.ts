import { IsEnum, IsInt, Min, Max } from 'class-validator'
import { GermanLevel, UserGoal, UserProfile } from '@prisma/client'

export class OnboardingDto {
  @IsEnum(GermanLevel)
  level: GermanLevel

  @IsEnum(UserProfile)
  profile: UserProfile

  @IsEnum(UserGoal)
  goal: UserGoal

  @IsInt()
  @Min(15)
  @Max(120)
  dailyMinutes: number
}
