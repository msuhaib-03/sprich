-- CreateIndex
CREATE INDEX "exercises_lessonId_idx" ON "exercises"("lessonId");

-- CreateIndex
CREATE INDEX "speaking_sessions_userId_idx" ON "speaking_sessions"("userId");

-- CreateIndex
CREATE INDEX "users_xp_idx" ON "users"("xp");
