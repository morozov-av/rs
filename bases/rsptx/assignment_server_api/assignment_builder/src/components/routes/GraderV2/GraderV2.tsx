/**
 * GraderV2 – main entry component for the `/graderV2` route.
 *
 * Composes:
 * - `GraderAssignmentPicker` – new TypeScript dropdown for assignment selection
 *    (replaces legacy `AssignmentPicker`)
 * - `QuestionSummaryTable` – per-question statistics & drill-down
 *    (replaces legacy `AssignmentSummary`)
 * - `QuestionReviewPanel` – question-type-specific grading views
 *
 * NOTE: The legacy `AssignmentPicker` and `AssignmentSummary` components were
 * used only as a reference for required functionality. They are NOT imported
 * here because they are scheduled for removal.
 */
import { useGetAssignmentQuery } from "@store/assignment/assignment.logic.api";
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { graderActions, graderSelectors } from "@/store/grader/grader.logic";
import {
  useGetQuestionSummariesQuery,
  useGetStudentAnswersQuery
} from "@/store/grader/grader.logic.api";
import { QuestionSummary } from "@/types/grader";
import { formatLocalDateForDisplay } from "@/utils/date";

import styles from "./GraderV2.module.css";
import { GraderAssignmentPicker } from "./components/GraderAssignmentPicker";
import { QuestionReviewPanel } from "./components/QuestionReviewPanel";
import { QuestionSummaryTable } from "./components/QuestionSummaryTable";

export const GraderV2: React.FC = () => {
  const dispatch = useDispatch();

  const selectedAssignmentId = useSelector(graderSelectors.getSelectedAssignmentId);
  const selectedQuestionId = useSelector(graderSelectors.getSelectedQuestionId);
  const viewMode = useSelector(graderSelectors.getViewMode);

  // Fetch the full assignment object for the selected id (name, points, duedate, etc.)
  const { data: selectedAssignment } = useGetAssignmentQuery(selectedAssignmentId!, {
    skip: !selectedAssignmentId
  });

  // Fetch question summaries when an assignment is selected
  const {
    data: summariesData,
    isFetching: summariesLoading
  } = useGetQuestionSummariesQuery(
    { assignmentId: selectedAssignmentId! },
    { skip: !selectedAssignmentId }
  );

  // Fetch student answers when a question is selected
  const {
    data: answersData,
    isFetching: answersLoading
  } = useGetStudentAnswersQuery(
    { assignmentId: selectedAssignmentId!, questionId: selectedQuestionId! },
    { skip: !selectedAssignmentId || !selectedQuestionId }
  );

  const summaries: QuestionSummary[] = useMemo(
    () => summariesData?.summaries ?? [],
    [summariesData]
  );

  const selectedQuestionSummary = useMemo(
    () => summaries.find((s) => s.questionId === selectedQuestionId) ?? null,
    [summaries, selectedQuestionId]
  );

  const handleQuestionSelect = (questionId: number) => {
    dispatch(graderActions.setSelectedQuestionId(questionId));
  };

  const handleBackToSummary = () => {
    dispatch(graderActions.setSelectedQuestionId(null));
  };

  return (
    <div className={styles.graderContainer}>
      {/* Header */}
      <div className={styles.graderHeader}>
        <h1>Assignment Grader</h1>
      </div>

      {/* Assignment picker (new TypeScript component) */}
      <GraderAssignmentPicker />

      {/* Selected assignment info banner */}
      {selectedAssignment && (
        <div className={styles.selectedAssignmentInfo}>
          <i className="pi pi-bookmark" />
          <strong>{selectedAssignment.name}</strong>
          <span>
            {selectedAssignment.points} pts &middot; Due{" "}
            {selectedAssignment.duedate
              ? formatLocalDateForDisplay(selectedAssignment.duedate, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "—"}
          </span>
        </div>
      )}

      {/* Question-level summary table */}
      {selectedAssignmentId && viewMode === "summary" && (
        <div className={styles.summarySection}>
          <h2>Question Breakdown</h2>
          <QuestionSummaryTable
            summaries={summaries}
            loading={summariesLoading}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      )}

      {/* Question-type-specific review panel */}
      {selectedAssignmentId &&
        viewMode === "question" &&
        selectedQuestionSummary && (
          <QuestionReviewPanel
            questionSummary={selectedQuestionSummary}
            answers={answersData?.answers ?? []}
            answersLoading={answersLoading}
            onBack={handleBackToSummary}
          />
        )}
    </div>
  );
};



