/**
 * CodeAnswerView – renders student answers for coding (activecode) questions.
 *
 * Features:
 * - Student selector dropdown
 * - History slider to scrub through code snapshots
 * - Code display panel with syntax-highlighted output
 * - Inline partial-credit grade editor
 */
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Slider } from "primereact/slider";
import { Tag } from "primereact/tag";
import React, { useMemo, useState } from "react";

import { CodeHistoryEntry, StudentAnswer } from "@/types/grader";

import styles from "../GraderV2.module.css";

interface CodeAnswerViewProps {
  answers: StudentAnswer[];
  /** Function to load code history for a given student. */
  codeHistory: CodeHistoryEntry[];
  codeHistoryLoading: boolean;
  onStudentSelect: (sid: string) => void;
  onGradeUpdate: (answerId: number, points: number, comment: string) => void;
}

export const CodeAnswerView: React.FC<CodeAnswerViewProps> = ({
  answers,
  codeHistory,
  codeHistoryLoading,
  onStudentSelect,
  onGradeUpdate
}) => {
  const [selectedSid, setSelectedSid] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [editPoints, setEditPoints] = useState<number | null>(null);
  const [editComment, setEditComment] = useState<string>("");

  const studentOptions = useMemo(
    () => answers.map((a) => ({ label: a.sid, value: a.sid })),
    [answers]
  );

  const selectedAnswer = useMemo(
    () => answers.find((a) => a.sid === selectedSid) ?? null,
    [answers, selectedSid]
  );

  const currentSnapshot: CodeHistoryEntry | null = useMemo(() => {
    if (codeHistory.length === 0) return null;
    const idx = Math.min(historyIndex, codeHistory.length - 1);

    return codeHistory[idx] ?? null;
  }, [codeHistory, historyIndex]);

  const handleStudentChange = (sid: string) => {
    setSelectedSid(sid);
    setHistoryIndex(0);
    setEditPoints(null);
    setEditComment("");
    onStudentSelect(sid);
  };

  const handleSaveGrade = () => {
    if (selectedAnswer && editPoints !== null) {
      onGradeUpdate(selectedAnswer.id, editPoints, editComment);
    }
  };

  return (
    <div className={styles.codeReviewContainer}>
      {/* Student list table */}
      <DataTable
        value={answers}
        paginator
        rows={10}
        dataKey="id"
        selectionMode="single"
        selection={selectedAnswer}
        onSelectionChange={(e) => {
          const row = e.value as StudentAnswer;

          if (row) handleStudentChange(row.sid);
        }}
        sortField="sid"
        sortOrder={1}
        emptyMessage="No student answers found."
        size="small"
        stripedRows
      >
        <Column field="sid" header="Student" sortable />
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

      {/* Code review panel */}
      {selectedSid && (
        <div>
          <h3>
            Code Review – <em>{selectedSid}</em>
          </h3>

          {codeHistoryLoading && <p>Loading history…</p>}

          {!codeHistoryLoading && codeHistory.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <label>History ({historyIndex + 1} / {codeHistory.length})</label>
                <Slider
                  value={historyIndex}
                  onChange={(e) => setHistoryIndex(e.value as number)}
                  min={0}
                  max={codeHistory.length - 1}
                  step={1}
                  className={styles.codeHistorySlider}
                  style={{ flex: 1 }}
                />
              </div>

              {currentSnapshot && (
                <>
                  <pre className={styles.codeBlock}>{currentSnapshot.code}</pre>
                  {currentSnapshot.output && (
                    <>
                      <strong>Output:</strong>
                      <pre className={styles.codeOutput}>{currentSnapshot.output}</pre>
                    </>
                  )}
                  <small style={{ color: "#888" }}>
                    Snapshot at {currentSnapshot.timestamp}
                  </small>
                </>
              )}
            </>
          )}

          {!codeHistoryLoading && codeHistory.length === 0 && (
            <p>No code history available for this student.</p>
          )}

          {/* Inline grade editor */}
          {selectedAnswer && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "end", marginTop: "1rem" }}>
              <div>
                <label>Points (max {selectedAnswer.maxPoints})</label>
                <InputNumber
                  value={editPoints ?? selectedAnswer.points}
                  onValueChange={(e) => setEditPoints(e.value ?? 0)}
                  min={0}
                  max={selectedAnswer.maxPoints}
                  className={styles.gradeInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Comment</label>
                <InputText
                  value={editComment || selectedAnswer.comment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className={styles.commentInput}
                  placeholder="Add comment…"
                />
              </div>
              <button
                className="p-button p-button-sm p-button-success"
                onClick={handleSaveGrade}
              >
                Save Grade
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


