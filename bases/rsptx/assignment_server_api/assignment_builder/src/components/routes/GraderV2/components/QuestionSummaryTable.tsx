/**
 * QuestionSummaryTable – displays per-question statistics for the selected
 * assignment and allows the educator to drill into a specific question.
 */
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressBar } from "primereact/progressbar";
import React from "react";

import { QuestionSummary } from "@/types/grader";

import styles from "../GraderV2.module.css";
import { getQuestionTypeLabel } from "../graderUtils";

interface QuestionSummaryTableProps {
  summaries: QuestionSummary[];
  loading: boolean;
  onQuestionSelect: (questionId: number) => void;
}

export const QuestionSummaryTable: React.FC<QuestionSummaryTableProps> = ({
  summaries,
  loading,
  onQuestionSelect
}) => {
  const typeBodyTemplate = (row: QuestionSummary) => (
    <span
      className={styles.questionTypeBadge}
      data-type={row.questionType}
    >
      {getQuestionTypeLabel(row.questionType)}
    </span>
  );

  const averageBodyTemplate = (row: QuestionSummary) => {
    const pct = row.maxPoints > 0 ? (row.averageScore / row.maxPoints) * 100 : 0;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <ProgressBar
          value={Math.round(pct)}
          showValue={false}
          style={{ height: "0.6rem", flex: 1 }}
        />
        <span style={{ whiteSpace: "nowrap" }}>
          {row.averageScore.toFixed(1)} / {row.maxPoints}
        </span>
      </div>
    );
  };

  const submissionBodyTemplate = (row: QuestionSummary) => (
    <span>
      {row.submissionCount} / {row.totalStudents}
    </span>
  );

  return (
    <DataTable
      value={summaries}
      loading={loading}
      paginator
      rows={20}
      dataKey="questionId"
      sortField="qnumber"
      sortOrder={1}
      emptyMessage="No questions found for this assignment."
      stripedRows
      size="small"
      selectionMode="single"
      onSelectionChange={(e) => {
        const row = e.value as QuestionSummary;

        if (row) onQuestionSelect(row.questionId);
      }}
    >
      <Column field="qnumber" header="Question" sortable style={{ minWidth: "10rem" }} />
      <Column field="title" header="Title" sortable style={{ minWidth: "12rem" }} />
      <Column
        field="questionType"
        header="Type"
        body={typeBodyTemplate}
        sortable
        style={{ width: "10rem" }}
      />
      <Column
        field="averageScore"
        header="Average"
        body={averageBodyTemplate}
        sortable
        style={{ minWidth: "14rem" }}
      />
      <Column
        field="minScore"
        header="Min"
        sortable
        style={{ width: "5rem" }}
      />
      <Column
        field="maxScore"
        header="Max"
        sortable
        style={{ width: "5rem" }}
      />
      <Column
        field="submissionCount"
        header="Submissions"
        body={submissionBodyTemplate}
        sortable
        style={{ width: "9rem" }}
      />
    </DataTable>
  );
};

