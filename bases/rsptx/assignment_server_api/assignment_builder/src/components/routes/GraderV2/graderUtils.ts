/**
 * Helper utilities for the GraderV2 interface.
 */
import { ExerciseType } from "@/types/exercises";

/**
 * Question display categories used by the grader to choose the
 * appropriate rendering strategy.
 */
export type QuestionDisplayCategory = "tabular" | "code" | "parsons";

/**
 * Maps a question type to its display category.
 *
 * - **tabular**: mchoice, fillintheblank, shortanswer, poll, matching,
 *   dragndrop, clickablearea, selectquestion, iframe
 * - **code**: activecode
 * - **parsons**: parsonsprob
 */
export const getDisplayCategory = (
  questionType: ExerciseType | string
): QuestionDisplayCategory => {
  switch (questionType) {
    case "activecode":
      return "code";
    case "parsonsprob":
      return "parsons";
    default:
      return "tabular";
  }
};

/**
 * Friendly labels for question types.
 */
export const questionTypeLabels: Record<string, string> = {
  mchoice: "Multiple Choice",
  fillintheblank: "Fill in the Blank",
  shortanswer: "Short Answer",
  activecode: "Active Code",
  parsonsprob: "Parsons Problem",
  poll: "Poll",
  dragndrop: "Drag & Drop",
  clickablearea: "Clickable Area",
  matching: "Matching",
  selectquestion: "Select Question",
  iframe: "Iframe"
};

/**
 * Return a human-readable label for a question type string.
 */
export const getQuestionTypeLabel = (questionType: string): string =>
  questionTypeLabels[questionType] ?? questionType;

