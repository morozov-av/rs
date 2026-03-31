/**
 * ParsonsAnswerView – renders student answers for Parsons problems.
 *
 * Shows each student's submitted block ordering with indentation,
 * along with an inline partial-credit editor.
 */
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import React, { useMemo, useState } from "react";

import { ParsonsStudentAnswer, ParsonsStudentBlock, StudentAnswer } from "@/types/grader";

import styles from "../GraderV2.module.css";

interface ParsonsAnswerViewProps {
  answers: StudentAnswer[];
  onGradeUpdate: (answerId: number, points: number, comment: string) => void;
}

/**
 * Tries to parse blocks from the student's answer JSON.
 * Falls back to a single block with the raw answer text.
 */
const parseBlocks = (answer: StudentAnswer): ParsonsStudentBlock[] => {
  try {
    const parsed = JSON.parse(answer.answer);

    if (Array.isArray(parsed)) {
      return parsed.map((b: { content?: string; indent?: number; text?: string }) => ({
        content: b.content ?? b.text ?? String(b),
        indent: b.indent ?? 0
      }));
    }
  } catch {
    // not JSON – fall through
  }

  return [{ content: answer.answer, indent: 0 }];
};

const BlockList: React.FC<{ blocks: ParsonsStudentBlock[] }> = ({ blocks }) => (
  <div className={styles.parsonsBlockList}>
    {blocks.map((block, idx) => (
      <div
        key={idx}
        className={styles.parsonsBlock}
        style={{ marginLeft: `${block.indent * 2}rem` }}
      >
        <span className={styles.parsonsBlockIndex}>{idx + 1}</span>
        <span className={styles.parsonsBlockContent}>{block.content}</span>
      </div>
    ))}
  </div>
);

export const ParsonsAnswerView: React.FC<ParsonsAnswerViewProps> = ({
  answers,
  onGradeUpdate
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<StudentAnswer | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>("");

  const enrichedAnswers: ParsonsStudentAnswer[] = useMemo(
    () =>
      answers.map((a) => ({
        ...a,
        blocks: parseBlocks(a)
      })),
    [answers]
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

  const blocksBodyTemplate = (rowData: ParsonsStudentAnswer) => {
    const preview =
      rowData.blocks.length > 0
        ? rowData.blocks
            .slice(0, 3)
            .map((b) => b.content)
            .join(" → ")
        : "—";

    return (
      <span
        style={{ cursor: "pointer", textDecoration: "underline dotted" }}
        onClick={() => openDetail(rowData)}
        title="Click to view full block layout"
      >
        {preview}
        {rowData.blocks.length > 3 ? " …" : ""}
      </span>
    );
  };

  return (
    <div>
      <DataTable
        value={enrichedAnswers}
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
        <Column header="Blocks" body={blocksBodyTemplate} style={{ minWidth: "16rem" }} />
        <Column
          field="correct"
          header="Auto-Grade"
          body={(row: ParsonsStudentAnswer) =>
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
          body={(row: ParsonsStudentAnswer) => `${row.points} / ${row.maxPoints}`}
          sortable
          style={{ width: "8rem" }}
        />
      </DataTable>

      {/* Detail dialog */}
      <Dialog
        header={`Parsons Answer – ${selectedAnswer?.sid ?? ""}`}
        visible={dialogVisible}
        style={{ width: "40rem" }}
        onHide={() => setDialogVisible(false)}
      >
        {selectedAnswer && (
          <>
            <BlockList blocks={parseBlocks(selectedAnswer)} />

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "end",
                marginTop: "1.5rem"
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

