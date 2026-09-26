import { db } from "@/lib/db";
import { hasPermission, ForbiddenError, type CurrentUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

/**
 * Academy-Content-Verwaltung: Entwurfsversionen (Kopie), Bearbeitung, Publish.
 * Veröffentlichte Versionen sind eingefroren – Änderungen nur an Entwürfen.
 */

export async function createDraftVersion(user: CurrentUser, courseId: string) {
  if (!hasPermission(user, "academy.editContent")) throw new ForbiddenError();

  const latest = await db.trainingCourseVersion.findFirst({
    where: { courseId },
    orderBy: { version: "desc" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
          },
        },
      },
      assets: true,
    },
  });
  if (!latest) throw new Error("Keine Ausgangsversion vorhanden.");
  const existingDraft = await db.trainingCourseVersion.findFirst({ where: { courseId, publishedAt: null } });
  if (existingDraft) throw new Error("Es existiert bereits ein unveröffentlichter Entwurf.");

  const draft = await db.trainingCourseVersion.create({
    data: {
      courseId,
      version: latest.version + 1,
      passScore: latest.passScore,
      changelog: `Entwurf auf Basis von Version ${latest.version}`,
    },
  });
  for (const moduleDef of latest.modules) {
    const newModule = await db.trainingModule.create({
      data: {
        courseVersionId: draft.id,
        sortOrder: moduleDef.sortOrder,
        title: moduleDef.title,
        intro: moduleDef.intro,
        required: moduleDef.required,
      },
    });
    for (const lesson of moduleDef.lessons) {
      const newLesson = await db.trainingLesson.create({
        data: {
          moduleId: newModule.id,
          sortOrder: lesson.sortOrder,
          title: lesson.title,
          content: lesson.content as Prisma.InputJsonValue,
          sourceSlides: lesson.sourceSlides,
        },
      });
      for (const question of lesson.questions) {
        await db.trainingQuestion.create({
          data: {
            lessonId: newLesson.id,
            sortOrder: question.sortOrder,
            question: question.question,
            explanation: question.explanation,
            finalCheck: question.finalCheck,
            options: { create: question.options.map((o) => ({ sortOrder: o.sortOrder, text: o.text, correct: o.correct })) },
          },
        });
      }
    }
  }
  for (const asset of latest.assets) {
    await db.trainingAsset.create({
      data: { courseVersionId: draft.id, mediaAssetId: asset.mediaAssetId, sourceSlide: asset.sourceSlide, caption: asset.caption },
    });
  }
  return draft;
}

export async function publishVersion(user: CurrentUser, versionId: string) {
  if (!hasPermission(user, "academy.editContent")) throw new ForbiddenError();
  const version = await db.trainingCourseVersion.findUniqueOrThrow({ where: { id: versionId } });
  if (version.publishedAt) throw new Error("Diese Version ist bereits veröffentlicht.");
  await db.trainingCourseVersion.update({ where: { id: versionId }, data: { publishedAt: new Date() } });
  await audit({ action: "academy.version.published", actorId: user.id, entityType: "TrainingCourseVersion", entityId: versionId, meta: { version: version.version } });
}

async function assertDraftLesson(lessonId: string) {
  const lesson = await db.trainingLesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { module: { include: { courseVersion: true } } },
  });
  if (lesson.module.courseVersion.publishedAt) {
    throw new Error("Veröffentlichte Versionen sind eingefroren. Bitte zuerst einen neuen Entwurf erstellen.");
  }
  return lesson;
}

// ---------- Text-Format für Lektionen (kein Code, klar dokumentiert) ----------

type Block = Record<string, unknown> & { type: string };

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "intro":
          return `[text]\n${block.text as string}`;
        case "steps":
          return `[schritte${block.title ? ` ${block.title as string}` : ""}]\n${(block.items as string[]).map((i) => `- ${i}`).join("\n")}`;
        case "screenshot":
          return `[screenshot ${block.mediaId as string}]\n${(block.alt as string) ?? ""}${block.caption ? `\n:: ${block.caption as string}` : ""}`;
        case "warning":
          return `[wichtig]\n${block.text as string}`;
        case "remember":
          return `[merken]\n${(block.items as string[]).map((i) => `- ${i}`).join("\n")}`;
        case "example":
          return `[beispiel]\n${block.text as string}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function textToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const parts = text.split(/\n(?=\[)/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^\[([^\]\s]+)([^\]]*)\]\n?([\s\S]*)$/);
    if (!match) continue;
    const kind = (match[1] ?? "").toLowerCase();
    const param = (match[2] ?? "").trim();
    const body = (match[3] ?? "").trim();
    const lines = body.split("\n").map((l) => l.trim());
    const items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
    switch (kind) {
      case "text":
        if (body) blocks.push({ type: "intro", text: body });
        break;
      case "schritte":
        blocks.push({ type: "steps", ...(param ? { title: param } : {}), items });
        break;
      case "screenshot": {
        const alt = lines.find((l) => l && !l.startsWith("::")) ?? "";
        const caption = lines.find((l) => l.startsWith("::"))?.slice(2).trim();
        if (param) blocks.push({ type: "screenshot", mediaId: param, alt, ...(caption ? { caption } : {}) });
        break;
      }
      case "wichtig":
        if (body) blocks.push({ type: "warning", text: body });
        break;
      case "merken":
        blocks.push({ type: "remember", items });
        break;
      case "beispiel":
        if (body) blocks.push({ type: "example", text: body });
        break;
    }
  }
  return blocks;
}

export async function saveLesson(
  user: CurrentUser,
  lessonId: string,
  data: { title: string; contentText: string },
) {
  if (!hasPermission(user, "academy.editContent")) throw new ForbiddenError();
  await assertDraftLesson(lessonId);
  const blocks = textToBlocks(data.contentText);
  await db.trainingLesson.update({
    where: { id: lessonId },
    data: { title: data.title, content: { blocks } as Prisma.InputJsonValue },
  });
}

// ---------- Fragen-Format ----------
// F: Fragetext
// + richtige Antwort
// - falsche Antwort
// E: Erklärung bei falscher Antwort
// ! (optional in eigener Zeile) markiert die Frage als Teil des Abschluss-Checks

export function questionsToText(
  questions: Array<{ question: string; explanation: string; finalCheck: boolean; options: Array<{ text: string; correct: boolean }> }>,
): string {
  return questions
    .map((q) =>
      [
        `F: ${q.question}`,
        ...q.options.map((o) => `${o.correct ? "+" : "-"} ${o.text}`),
        `E: ${q.explanation}`,
        ...(q.finalCheck ? ["!"] : []),
      ].join("\n"),
    )
    .join("\n\n");
}

export async function saveQuestions(user: CurrentUser, lessonId: string, text: string) {
  if (!hasPermission(user, "academy.editContent")) throw new ForbiddenError();
  await assertDraftLesson(lessonId);

  const questionBlocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const parsed = questionBlocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const q = lines.find((l) => l.startsWith("F:"))?.slice(2).trim();
    const explanation = lines.find((l) => l.startsWith("E:"))?.slice(2).trim() ?? "";
    const finalCheck = lines.includes("!");
    const options = lines
      .filter((l) => l.startsWith("+") || (l.startsWith("-") && !l.startsWith("- ")) || l.startsWith("- "))
      .filter((l) => l.startsWith("+") || l.startsWith("-"))
      .map((l) => ({ correct: l.startsWith("+"), text: l.slice(1).trim() }));
    if (!q || options.length < 2 || !options.some((o) => o.correct)) {
      throw new Error(`Frage unvollständig: „${(q ?? block).slice(0, 60)}…“ – benötigt F:, mindestens 2 Antworten und eine richtige (+).`);
    }
    return { question: q, explanation, finalCheck, options };
  });

  await db.$transaction(async (tx) => {
    await tx.trainingQuestion.deleteMany({ where: { lessonId } });
    for (const [qi, q] of parsed.entries()) {
      await tx.trainingQuestion.create({
        data: {
          lessonId,
          sortOrder: qi,
          question: q.question,
          explanation: q.explanation,
          finalCheck: q.finalCheck,
          options: { create: q.options.map((o, oi) => ({ sortOrder: oi, text: o.text, correct: o.correct })) },
        },
      });
    }
  });
}
