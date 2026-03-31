/**
 * QuestionReviewPanel – delegates to the appropriate answer-view component
 * based on the question type (tabular, code, or parsons).
 */
import React, { useCallback, useMemo, useState } from "react";

import { useGetCodeHistoryQuery, useUpdateGradeMutation } from "@/store/grader/grader.logic.api";
import { CodeHistoryEntry, QuestionSummary, StudentAnswer } from "@/types/grader";

import styles from "../GraderV2.module.css";
import { getDisplayCategory, getQuestionTypeLabel } from "../graderUtils";

import { CodeAnswerView } from "./CodeAnswerView";
import { ParsonsAnswerView } from "./ParsonsAnswerView";
import { TabularAnswerView } from "./TabularAnswerView";

interface QuestionReviewPanelProps {
  questionSummary: QuestionSummary;
  answers: StudentAnswer[];
  answersLoading: boolean;
  onBack: () => void;
}

export const QuestionReviewPanel: React.FC<QuestionReviewPanelProps> = ({
  questionSummary,
  answers,
  answersLoading,
  onBack
}) => {
  const [updateGrade] = useUpdateGradeMutation();
  const [selectedStudentSid, setSelectedStudentSid] = useState<string | null>(null);

  const category = useMemo(
    () => getDisplayCategory(questionSummary.questionType),
    [questionSummary.questionType]
  );

  // Code history query – only fires for coding questions when a student is selected
  const {
    data: codeHistoryData,
    isFetching: codeHistoryLoading
  } = useGetCodeHistoryQuery(
    { questionId: questionSummary.questionId, sid: selectedStudentSid! },
    { skip: category !== "code" || !selectedStudentSid }
  );

  const codeHistory: CodeHistoryEntry[] = useMemo(
    () => codeHistoryData?.history ?? [],
    [codeHistoryData]
  );

  const handleGradeUpdate = useCallback(
    (answerId: number, points: number, comment: string) => {
      updateGrade({ answerId, points, comment });
    },
    [updateGrade]
  );

  if (answersLoading) {
    return <p>Loading student answers…</p>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <a onClick={onBack}>← Back to Summary</a>
        <span>/</span>
        <span>
          {questionSummary.qnumber} – {questionSummary.title}
        </span>
        <span
          className={styles.questionTypeBadge}
          data-type={questionSummary.questionType}
        >
          {getQuestionTypeLabel(questionSummary.questionType)}
        </span>
      </div>

      <h2 style={{ marginTop: "0.5rem" }}>
        {questionSummary.title}{" "}
        <small style={{ fontWeight: 400, color: "#888" }}>({questionSummary.qnumber})</small>
      </h2>

      {/* Render the appropriate view */}
      {category === "tabular" && (
        <TabularAnswerView answers={answers} onGradeUpdate={handleGradeUpdate} />
      )}

      {category === "code" && (
        <CodeAnswerView
          answers={answers}
          codeHistory={codeHistory}
          codeHistoryLoading={codeHistoryLoading}
          onStudentSelect={setSelectedStudentSid}
          onGradeUpdate={handleGradeUpdate}
        />
      )}

      {category === "parsons" && (
        <ParsonsAnswerView answers={answers} onGradeUpdate={handleGradeUpdate} />
      )}
    </div>
  );
};

