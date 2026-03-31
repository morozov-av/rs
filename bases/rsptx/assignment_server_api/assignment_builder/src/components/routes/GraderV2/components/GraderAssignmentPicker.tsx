/**
 * GraderAssignmentPicker – TypeScript replacement for the legacy AssignmentPicker.
 *
 * Uses the modern RTK Query `useGetAssignmentsQuery` hook to load assignments
 * and dispatches to the grader Redux slice on selection.
 *
 * Features (ported from the legacy AssignmentPicker):
 * - Dropdown with filter / search
 * - Sorted by due date (most recent first)
 * - Shows assignment name + formatted due date in each option
 */
import { Loader } from "@components/ui/Loader";
import { useGetAssignmentsQuery } from "@store/assignment/assignment.logic.api";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { graderActions, graderSelectors } from "@/store/grader/grader.logic";
import { Assignment } from "@/types/assignment";
import { formatLocalDateForDisplay } from "@/utils/date";

import styles from "../GraderV2.module.css";

/**
 * A single option rendered inside the dropdown.
 */
const AssignmentOptionTemplate: React.FC<{ option: Assignment }> = ({ option }) => (
  <div className={styles.pickerOption}>
    <span className={styles.pickerOptionName}>{option.name}</span>
    <span className={styles.pickerOptionDate}>
      {option.duedate
        ? formatLocalDateForDisplay(option.duedate, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "—"}
    </span>
  </div>
);

export const GraderAssignmentPicker: React.FC = () => {
  const dispatch = useDispatch();
  const { data: assignments = [], isLoading, isError } = useGetAssignmentsQuery();
  const selectedAssignmentId = useSelector(graderSelectors.getSelectedAssignmentId);

  // Find the currently selected assignment object (for the Dropdown `value`)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Sort assignments by due date, most recent first; filter out nameless ones
  const sortedAssignments = useMemo(() => {
    return [...assignments]
      .filter((a) => a.name && a.name.trim() !== "")
      .sort((a, b) => (b.duedate ?? "").localeCompare(a.duedate ?? ""));
  }, [assignments]);

  // Keep local selection in sync when assignments load
  useMemo(() => {
    if (selectedAssignmentId && !selectedAssignment) {
      const found = sortedAssignments.find((a) => a.id === selectedAssignmentId);

      if (found) setSelectedAssignment(found);
    }
  }, [sortedAssignments, selectedAssignmentId, selectedAssignment]);

  const handleChange = (e: DropdownChangeEvent) => {
    const assignment = e.value as Assignment | null;

    if (assignment) {
      setSelectedAssignment(assignment);
      dispatch(graderActions.setSelectedAssignmentId(assignment.id));
    } else {
      // showClear triggers onChange with null value
      setSelectedAssignment(null);
      dispatch(graderActions.setSelectedAssignmentId(null));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pickerLoading}>
        <Loader size={24} />
        <span>Loading assignments…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.pickerError}>
        <i className="pi pi-exclamation-triangle" />
        <span>Failed to load assignments.</span>
      </div>
    );
  }

  return (
    <div className={styles.assignmentPickerWrapper}>
      <Dropdown
        value={selectedAssignment}
        options={sortedAssignments}
        onChange={handleChange}
        optionLabel="name"
        placeholder="Choose an assignment to grade"
        filter
        filterPlaceholder="Search assignments…"
        itemTemplate={(option) => <AssignmentOptionTemplate option={option} />}
        className={styles.pickerDropdown}
        emptyMessage="No assignments found"
        showClear
      />
    </div>
  );
};



