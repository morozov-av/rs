/**
 * ParsonsAnswerView – renders student answers for Parsons problems.
 *
 * Shows each student in a table. Clicking a row opens a dialog with:
 * - A standard Runestone exercise preview showing the student's answer.
 * - An inline grade editor (points + comment + save).
 */
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import React, { useState } from "react";

import { useGetQuestionHtmlSrcQuery } from "@/store/grader/grader.logic.api";
import { StudentAnswer } from "@/types/grader";

import styles from "../GraderV2.module.css";

import { StudentExercisePreview } from "./StudentExercisePreview";

interface ParsonsAnswerViewProps {
  answers: StudentAnswer[];
  /** The question name / div_id (e.g. "grader_parsons_swap") – used to fetch htmlsrc for preview. */
  questionName: string;
  /** Optional assignment id for resolving the correct question source. */
  assignmentId?: number;
  onGradeUpdate: (answerId: number, points: number, comment: string) => void;
}

export const ParsonsAnswerView: React.FC<ParsonsAnswerViewProps> = ({
  answers,
  questionName,
  assignmentId,
  onGradeUpdate
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<StudentAnswer | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>("");

  // Fetch htmlsrc for the Runestone preview
  const { data: htmlSrcData, isFetching: htmlSrcLoading } = useGetQuestionHtmlSrcQuery(
    { acid: questionName, assignmentId },
    { skip: !questionName }
  );

  const openDetail = (answer: StudentAnswer) => {
    setSelectedAnswer(answer);
    setEditPoints(answer.points);
    setEditComment(answer.comment);
    setDialogVisible(true);
  };

  const handleSave = () => {
    if (selectedAnswer) {
      onGradeUpdate(selectedAnswer.id, editPoints, editComment);
      setDialogVisible(false);
    }
  };

  return (
    <div>
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
        selectionMode="single"
        onRowSelect={(e) => openDetail(e.data as StudentAnswer)}
        style={{ cursor: "pointer" }}
      >
        <Column field="sid" header="Student" sortable style={{ minWidth: "8rem" }} />
        <Column
          field="answer"
          header="Answer"
          body={(row: StudentAnswer) => (
            <span
              style={{ maxWidth: "20rem", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={row.answer}
            >
              {row.answer}
            </span>
          )}
          style={{ minWidth: "16rem" }}
        />
        <Column
          field="correct"
          header="Auto-Grade"
          body={(row: StudentAnswer) =>
            row.correct ? (
              <Tag severity="success" value="Correct" />
            ) : (
              <Tag severity="danger" value="Incorrect" />
            )
          }
          sortable
          style={{ width: "8rem" }}
        />
        <Column
          field="points"
          header="Points"
          body={(row: StudentAnswer) => `${row.points} / ${row.maxPoints}`}
          sortable
          style={{ width: "8rem" }}
        />
      </DataTable>

      {/* Detail dialog with Runestone preview */}
      <Dialog
        header={`Parsons Answer – ${selectedAnswer?.sid ?? ""}`}
        visible={dialogVisible}
        style={{ width: "50rem", maxHeight: "90vh" }}
        onHide={() => setDialogVisible(false)}
        contentStyle={{ overflow: "auto" }}
      >
        {selectedAnswer && (
          <>
            {/* Runestone exercise preview with student's answer */}
            {htmlSrcLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <ProgressSpinner style={{ width: "3rem", height: "3rem" }} />
              </div>
            ) : htmlSrcData?.htmlsrc ? (
              <StudentExercisePreview
                htmlsrc={htmlSrcData.htmlsrc}
                sid={selectedAnswer.sid}
              />
            ) : (
              <p style={{ color: "#888", fontStyle: "italic" }}>
                Preview not available for this question.
              </p>
            )}

            {/* Grade editor */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "end",
                marginTop: "1.5rem",
                borderTop: "1px solid #dee2e6",
                paddingTop: "1rem"
              }}
            >
              <div>
                <label>Points (max {selectedAnswer.maxPoints})</label>
                <InputNumber
                  value={editPoints}
                  onValueChange={(e) => setEditPoints(e.value ?? 0)}
                  min={0}
                  max={selectedAnswer.maxPoints}
                  className={styles.gradeInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Comment</label>
                <InputText
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className={styles.commentInput}
                  placeholder="Add comment…"
                />
              </div>
              <button
                className="p-button p-button-sm p-button-success"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
};

