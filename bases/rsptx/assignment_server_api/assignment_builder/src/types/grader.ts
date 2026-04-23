/**
 * Types for the GraderV2 interface.
 *
 * These types define the data structures used throughout the grading interface
 * for fetching student answers, rendering question-type-specific views, and
 * submitting partial-credit scores.
 */

import { ExerciseType } from "./exercises";

// ---------------------------------------------------------------------------
// Student answer types
// ---------------------------------------------------------------------------

/** Represents a single student's answer to a single question. */
export interface StudentAnswer {
  /** Unique identifier of the answer record. */
  id: number;
  /** Student identifier (username / sid). */
  sid: string;
  /** The question identifier (qnumber). */
  qnumber: string;
  /** The raw answer text submitted by the student. */
  answer: string;
  /** Whether the answer was marked correct by the autograder. */
  correct: boolean;
  /** Points awarded (may be partial). */
  points: number;
  /** Maximum possible points for this question. */
  maxPoints: number;
  /** Optional comment left by the grader. */
  comment: string;
  /** Timestamp of the submission. */
  timestamp: string;
  /** The type of question (mirrors ExerciseType). */
  questionType: ExerciseType | string;
}

/** Represents a history entry for a coding question (history slider). */
export interface CodeHistoryEntry {
  /** Unique id of the history snapshot. */
  id: number;
  /** Student identifier. */
  sid: string;
  /** The question identifier. */
  qnumber: string;
  /** The source code at this point in time. */
  code: string;
  /** Timestamp of the snapshot. */
  timestamp: string;
  /** Optional compiler / test output at this snapshot. */
  output: string;
}

/** A Parsons block as submitted by the student. */
export interface ParsonsStudentBlock {
  /** The text content of the block. */
  content: string;
  /** Indentation level (0-based). */
  indent: number;
}

/** Student answer enriched with Parsons-specific data. */
export interface ParsonsStudentAnswer extends StudentAnswer {
  /** Ordered list of blocks as arranged by the student. */
  blocks: ParsonsStudentBlock[];
}

// ---------------------------------------------------------------------------
// Aggregated question-level summary
// ---------------------------------------------------------------------------

/** Per-question summary statistics shown in the grader summary table. */
export interface QuestionSummary {
  /** The exercise / question id. */
  questionId: number;
  /** The question number string (display label, e.g. "Q-9"). */
  qnumber: string;
  /** The question name / div_id used in Runestone (e.g. "grader_parsons_swap"). */
  name: string;
  /** Display title of the question. */
  title: string;
  /** The type of question. */
  questionType: ExerciseType | string;
  /** Maximum possible points. */
  maxPoints: number;
  /** Average score across all students. */
  averageScore: number;
  /** Minimum score. */
  minScore: number;
  /** Maximum score achieved. */
  maxScore: number;
  /** Number of students who submitted an answer. */
  submissionCount: number;
  /** Total number of students enrolled. */
  totalStudents: number;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export interface GetStudentAnswersRequest {
  assignmentId: number;
  questionId: number;
}

export interface GetStudentAnswersResponse {
  answers: StudentAnswer[];
}

export interface GetCodeHistoryRequest {
  questionId: number;
  sid: string;
}

export interface GetCodeHistoryResponse {
  history: CodeHistoryEntry[];
}

export interface UpdateGradeRequest {
  answerId: number;
  points: number;
  comment: string;
}

export interface UpdateGradeResponse {
  success: boolean;
}

export interface GetQuestionHtmlSrcRequest {
  /** The question name (qnumber / acid). */
  acid: string;
  /** Optional assignment id for context. */
  assignmentId?: number;
}

export interface GetQuestionHtmlSrcResponse {
  htmlsrc: string;
}

export interface GetQuestionSummariesRequest {
  assignmentId: number;
}

export interface GetQuestionSummariesResponse {
  summaries: QuestionSummary[];
}

// ---------------------------------------------------------------------------
// Grader UI state
// ---------------------------------------------------------------------------

export type GraderViewMode = "summary" | "question";

export interface GraderState {
  /** Currently selected assignment id. */
  selectedAssignmentId: number | null;
  /** Currently selected question id (for drill-in). */
  selectedQuestionId: number | null;
  /** Current view mode. */
  viewMode: GraderViewMode;
}

