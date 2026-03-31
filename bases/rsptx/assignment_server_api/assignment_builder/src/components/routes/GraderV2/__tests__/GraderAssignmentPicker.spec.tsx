/**
 * Unit tests for the GraderAssignmentPicker component.
 */
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";

import { setupStore } from "@/store/store";

import { GraderAssignmentPicker } from "../components/GraderAssignmentPicker";

// Mock the RTK Query hook
const mockAssignments = [
  { id: 1, name: "Homework 1", duedate: "2025-09-01T23:59:00", points: 100 },
  { id: 2, name: "Homework 2", duedate: "2025-09-15T23:59:00", points: 50 },
  { id: 3, name: "", duedate: "2025-09-10T23:59:00", points: 0 }
];

vi.mock("@store/assignment/assignment.logic.api", () => ({
  useGetAssignmentsQuery: vi.fn(),
  assignmentApi: {
    reducerPath: "assignmentAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { invalidateTags: vi.fn() }
  }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { useGetAssignmentsQuery } from "@store/assignment/assignment.logic.api";

const mockedUseGetAssignmentsQuery = vi.mocked(useGetAssignmentsQuery);

// Mock PrimeReact Dropdown to simplify rendering
vi.mock("primereact/dropdown", () => ({
  Dropdown: ({ placeholder, options, emptyMessage }: any) => {
    if (!options || options.length === 0) {
      return <div data-testid="dropdown-empty">{emptyMessage}</div>;
    }

    return (
      <div data-testid="dropdown">
        <span>{placeholder}</span>
        <ul>
          {options.map((opt: any) => (
            <li key={opt.id} data-testid={`option-${opt.id}`}>
              {opt.name}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}));

const renderWithStore = (ui: React.ReactElement) => {
  const store = setupStore();

  return render(<Provider store={store}>{ui}</Provider>);
};

describe("GraderAssignmentPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator while assignments are loading", () => {
    mockedUseGetAssignmentsQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn()
    } as any);

    renderWithStore(<GraderAssignmentPicker />);

    expect(screen.getByText("Loading assignments…")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", () => {
    mockedUseGetAssignmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: vi.fn()
    } as any);

    renderWithStore(<GraderAssignmentPicker />);

    expect(screen.getByText("Failed to load assignments.")).toBeInTheDocument();
  });

  it("renders the dropdown with assignments when loaded", () => {
    mockedUseGetAssignmentsQuery.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as any);

    renderWithStore(<GraderAssignmentPicker />);

    const dropdown = screen.getByTestId("dropdown");

    expect(dropdown).toBeInTheDocument();
    // Nameless assignments should be filtered out
    expect(screen.getByTestId("option-1")).toBeInTheDocument();
    expect(screen.getByTestId("option-2")).toBeInTheDocument();
    expect(screen.queryByTestId("option-3")).not.toBeInTheDocument();
  });

  it("shows placeholder text", () => {
    mockedUseGetAssignmentsQuery.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as any);

    renderWithStore(<GraderAssignmentPicker />);

    expect(screen.getByText("Choose an assignment to grade")).toBeInTheDocument();
  });
});

