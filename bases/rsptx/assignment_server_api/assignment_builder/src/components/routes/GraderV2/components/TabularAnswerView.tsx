/**
 * TabularAnswerView – renders student answers for multiple-choice,
 * fill-in-the-blank, short-answer (and similar) questions in a
 * PrimeReact DataTable with inline partial-credit editing.
 */
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import React, { useCallback, useState } from "react";

import { StudentAnswer } from "@/types/grader";

import styles from "../GraderV2.module.css";

interface TabularAnswerViewProps {
  answers: StudentAnswer[];
  onGradeUpdate: (answerId: number, points: number, comment: string) => void;
}

interface EditableRow {
  answerId: number;
  points: number;
  comment: string;
}

export const TabularAnswerView: React.FC<TabularAnswerViewProps> = ({
  answers,
  onGradeUpdate
}) => {
  const [editingRows, setEditingRows] = useState<Record<number, EditableRow>>({});

  const startEditing = useCallback(
    (answer: StudentAnswer) => {
      if (!editingRows[answer.id]) {
        setEditingRows((prev) => ({
          ...prev,
          [answer.id]: {
            answerId: answer.id,
            points: answer.points,
            comment: answer.comment
          }
        }));
      }
    },
    [editingRows]
  );

  const commitEdit = useCallback(
    (answerId: number) => {
      const row = editingRows[answerId];

      if (row) {
        onGradeUpdate(row.answerId, row.points, row.comment);
        setEditingRows((prev) => {
          const next = { ...prev };

          delete next[answerId];

          return next;
        });
      }
    },
    [editingRows, onGradeUpdate]
  );

  const correctBodyTemplate = (rowData: StudentAnswer) => {
    return rowData.correct ? (
      <Tag severity="success" value="Correct" />
    ) : (
      <Tag severity="danger" value="Incorrect" />
    );
  };

  const pointsBodyTemplate = (rowData: StudentAnswer) => {
    const editing = editingRows[rowData.id];

    if (editing) {
      return (
        <InputNumber
          value={editing.points}
          onValueChange={(e) =>
            setEditingRows((prev) => ({
              ...prev,
              [rowData.id]: { ...prev[rowData.id], points: e.value ?? 0 }
            }))
          }
          onBlur={() => commitEdit(rowData.id)}
          min={0}
          max={rowData.maxPoints}
          className={styles.gradeInput}
          inputStyle={{ width: "4rem" }}
        />
      );
    }

    return (
      <span
        style={{ cursor: "pointer" }}
        onClick={() => startEditing(rowData)}
        title="Click to edit"
      >
        {rowData.points} / {rowData.maxPoints}
      </span>
    );
  };

  const commentBodyTemplate = (rowData: StudentAnswer) => {
    const editing = editingRows[rowData.id];

    if (editing) {
      return (
        <InputText
          value={editing.comment}
          onChange={(e) =>
            setEditingRows((prev) => ({
              ...prev,
              [rowData.id]: { ...prev[rowData.id], comment: e.target.value }
            }))
          }
          onBlur={() => commitEdit(rowData.id)}
          className={styles.commentInput}
          placeholder="Add comment…"
        />
      );
    }

    return (
      <span
        style={{ cursor: "pointer", fontStyle: rowData.comment ? "normal" : "italic" }}
        onClick={() => startEditing(rowData)}
        title="Click to edit"
      >
        {rowData.comment || "—"}
      </span>
    );
  };

  return (
    <div className={styles.tabularContainer}>
      <DataTable
        value={answers}
        paginator
        rows={20}
        dataKey="id"
        sortField="sid"
        sortOrder={1}
        emptyMessage="No student answers found."
        stripedRows
        size="small"
      >
        <Column field="sid" header="Student" sortable style={{ minWidth: "8rem" }} />
        <Column field="answer" header="Answer" sortable style={{ minWidth: "12rem" }} />
        <Column
          field="correct"
          header="Auto-Grade"
          body={correctBodyTemplate}
          sortable
          style={{ width: "8rem" }}
        />
        <Column
          field="points"
          header="Points"
          body={pointsBodyTemplate}
          sortable
          style={{ width: "10rem" }}
        />
        <Column
          field="comment"
          header="Comment"
          body={commentBodyTemplate}
          style={{ minWidth: "14rem" }}
        />
        <Column field="timestamp" header="Submitted" sortable style={{ width: "12rem" }} />
      </DataTable>
    </div>
  );
};

