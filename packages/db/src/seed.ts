import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ─── Types matching the curriculum JSON shape ──────────────────────────────

interface CurriculumFile {
  level: string
  chapter: number
  title: string
  description: string
  lessons: CurriculumLesson[]
}

interface CurriculumLesson {
  order: number
  title: string
  subtitle: string
  type: string
  estimatedMinutes: number
  xpReward: number
  isPremium: boolean
  hook: string
  explain: string
  examples: unknown[]
  vocabulary: CurriculumVocab[]
  exercises: CurriculumExercise[]
}

interface CurriculumVocab {
  german: string
  english: string
  article?: string
  gender?: string
  plural?: string
  exampleSentence: string
  exampleTranslation: string
  memoryHook?: string
}

interface CurriculumExercise {
  type: string
  order: number
  prompt: string
  options?: string[]
  correctAnswer: string
  explanation: string
  hint?: string
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function main() {
  const dir = path.join(__dirname, '..', '..', '..', 'content', 'curriculum')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))

  console.log(`📚 Found ${files.length} curriculum files`)

  // Clean curriculum tables (dev-safe: clears learning content, keeps users)
  await prisma.userProgress.deleteMany()
  await prisma.sRSCard.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.lessonVocab.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.chapter.deleteMany()
  await prisma.vocabWord.deleteMany()

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    const data: CurriculumFile = JSON.parse(raw)

    const chapter = await prisma.chapter.create({
      data: {
        level: data.level as Prisma.ChapterCreateInput['level'],
        number: data.chapter,
        title: data.title,
        description: data.description,
      },
    })

    for (const lesson of data.lessons) {
      const created = await prisma.lesson.create({
        data: {
          chapterId: chapter.id,
          order: lesson.order,
          title: lesson.title,
          subtitle: lesson.subtitle,
          type: lesson.type as Prisma.LessonCreateInput['type'],
          estimatedMinutes: lesson.estimatedMinutes,
          xpReward: lesson.xpReward,
          isPremium: lesson.isPremium,
          hook: lesson.hook,
          explain: lesson.explain,
          contentJson: {
            examples: lesson.examples,
            vocabulary: lesson.vocabulary,
          } as unknown as Prisma.InputJsonValue,
        },
      })

      // Exercises
      for (const ex of lesson.exercises) {
        await prisma.exercise.create({
          data: {
            lessonId: created.id,
            type: ex.type as Prisma.ExerciseCreateInput['type'],
            order: ex.order,
            prompt: ex.prompt,
            options: (ex.options ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            correctAnswer: ex.correctAnswer,
            explanation: ex.explanation,
            hint: ex.hint ?? null,
          },
        })
      }

      // Vocabulary words + lesson links
      for (const vocab of lesson.vocabulary) {
        const word = await prisma.vocabWord.create({
          data: {
            german: vocab.german,
            english: vocab.english,
            article: vocab.article ?? null,
            gender: (vocab.gender as Prisma.VocabWordCreateInput['gender']) ?? null,
            plural: vocab.plural ?? null,
            exampleSentence: vocab.exampleSentence,
            exampleTranslation: vocab.exampleTranslation,
            memoryHook: vocab.memoryHook ?? null,
            level: data.level as Prisma.VocabWordCreateInput['level'],
          },
        })
        await prisma.lessonVocab.create({
          data: { lessonId: created.id, vocabId: word.id },
        })
      }

      console.log(`  ✓ ${data.level} Ch${data.chapter} · ${lesson.title}`)
    }
  }

  const lessonCount = await prisma.lesson.count()
  const vocabCount = await prisma.vocabWord.count()
  console.log(`\n✅ Seeded ${lessonCount} lessons and ${vocabCount} vocabulary words`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
