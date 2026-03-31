/**
 * Unit tests for the TabularAnswerView component.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { StudentAnswer } from "@/types/grader";

import { TabularAnswerView } from "../components/TabularAnswerView";

// PrimeReact components use portals; provide a minimal mock so tests don't break.
vi.mock("primereact/datatable", () => ({
  DataTable: ({ children, value, emptyMessage }: any) => {
    if (!value || value.length === 0) return <div>{emptyMessage}</div>;

    return <table data-testid="data-table"><tbody>{children}</tbody></table>;
  }
}));
vi.mock("primereact/column", () => ({
  Column: () => null
}));

const mockAnswers: StudentAnswer[] = [
  {
    id: 100,
    sid: "student_a",
    qnumber: "q1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T12:00:00",
    questionType: "mchoice"
  },
  {
    id: 101,
    sid: "student_b",
    qnumber: "q1",
    answer: "C",
    correct: false,
    points: 0,
    maxPoints: 10,
    comment: "Wrong choice",
    timestamp: "2025-03-20T12:05:00",
    questionType: "mchoice"
  }
];

describe("TabularAnswerView", () => {
  it("renders the DataTable with answers", () => {
    const onGradeUpdate = vi.fn();

    render(<TabularAnswerView answers={mockAnswers} onGradeUpdate={onGradeUpdate} />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("shows empty message when no answers", () => {
    const onGradeUpdate = vi.fn();

    render(<TabularAnswerView answers={[]} onGradeUpdate={onGradeUpdate} />);

    expect(screen.getByText("No student answers found.")).toBeInTheDocument();
  });
});

