# GraderV2 – Assignment Grading Interface

> **Route:** `/graderV2`
> **Entry component:** `<GraderV2 />` (lazy-loaded in `App.tsx`)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Components](#components)
   - [GraderV2 (Main)](#graderv2-main)
   - [GraderAssignmentPicker](#graderassignmentpicker)
   - [QuestionSummaryTable](#questionsummarytable)
   - [QuestionReviewPanel](#questionreviewpanel)
   - [TabularAnswerView](#tabularanswerview)
   - [CodeAnswerView](#codeanswerview)
   - [ParsonsAnswerView](#parsonsanswerview)
5. [State Management](#state-management)
   - [Redux Slice](#redux-slice-graderlogicts)
   - [RTK Query API](#rtk-query-api-graderlogicapits)
6. [Types](#types)
7. [Utility Functions](#utility-functions)
8. [Question-Type Display Strategy](#question-type-display-strategy)
9. [Relationship to Legacy Components](#relationship-to-legacy-components)
10. [API Endpoints](#api-endpoints)
11. [Test Data & Test Suite](#test-data--test-suite)
12. [Navigation](#navigation)
13. [Styling](#styling)
14. [Getting Started](#getting-started)

---

## Overview

GraderV2 is a TypeScript-based grading interface that allows educators to:

- **Select an assignment** using a new `GraderAssignmentPicker` component.
- **View a per-question summary** with statistics (average, min, max, submission count).
- **Drill into any question** to see individual student answers.
- **Assign partial credit** with inline editing of points and comments.
- **Review coding questions** with a history slider to track code evolution.
- **Review Parsons problems** with block-order visualization.

The interface is accessible at the `/graderV2` route and is lazy-loaded for optimal bundle size.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                      App.tsx                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  Route: /graderV2 → <GraderV2 />              │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  GraderAssignmentPicker (new, TS)        │  │  │
│  │  │  Selected Assignment Info Banner         │  │  │
│  │  ├──────────────────────────────────────────┤  │  │
│  │  │  QuestionSummaryTable                    │  │  │
│  │  │   ↓ (click a question)                   │  │  │
│  │  │  QuestionReviewPanel                     │  │  │
│  │  │   ├─ TabularAnswerView  (mc/fib/sa)      │  │  │
│  │  │   ├─ CodeAnswerView     (activecode)     │  │  │
│  │  │   └─ ParsonsAnswerView  (parsonsprob)    │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Data flow:**

1. Educator picks an assignment → `GraderAssignmentPicker` dispatches `graderActions.setSelectedAssignmentId`.
2. `GraderV2` fetches the full assignment details via `useGetAssignmentQuery` and question summaries via `useGetQuestionSummariesQuery`.
3. Educator clicks a question row → `QuestionReviewPanel` fetches student answers (`getStudentAnswers`).
4. For coding questions, selecting a student triggers `getCodeHistory`.
5. Grade updates are sent via the `updateGrade` mutation.

---

## File Structure

```
src/
├── types/
│   └── grader.ts                          # All TypeScript types for the grader
│
├── store/
│   └── grader/
│       ├── grader.logic.ts                # Redux slice (UI state)
│       └── grader.logic.api.ts            # RTK Query API (server endpoints)
│
├── components/
│   └── routes/
│       └── GraderV2/
│           ├── index.ts                   # Re-export barrel
│           ├── GraderV2.tsx               # Main page component
│           ├── GraderV2.module.css        # CSS Modules styles
│           ├── graderUtils.ts             # Helper functions
│           ├── components/
│           │   ├── GraderAssignmentPicker.tsx  # NEW assignment dropdown
│           │   ├── QuestionSummaryTable.tsx
│           │   ├── QuestionReviewPanel.tsx
│           │   ├── TabularAnswerView.tsx
│           │   ├── CodeAnswerView.tsx
│           │   └── ParsonsAnswerView.tsx
│           └── __tests__/
│               ├── GraderAssignmentPicker.spec.tsx
│               ├── graderUtils.spec.ts
│               ├── graderSlice.spec.ts
│               ├── TabularAnswerView.spec.tsx
│               └── mockedGraderData.spec.ts
│
├── spec/
│   └── mock/
│       └── mockedGraderData.ts            # Comprehensive test fixtures
│
├── App.tsx                                # Route registration
├── navUtils.ts                            # Navigation bar (Grader V2 link added)
└── store/
    ├── rootReducer.ts                     # grader slice + API registered
    └── store.ts                           # grader API middleware registered
```

---

## Components

### GraderV2 (Main)

**File:** `src/components/routes/GraderV2/GraderV2.tsx`

The root component rendered at `/graderV2`. It:

- Renders `GraderAssignmentPicker` (new TypeScript component) for assignment selection.
- Shows a selected-assignment info banner (name, points, due date).
- Shows a `QuestionSummaryTable` when an assignment is selected.
- Switches to `QuestionReviewPanel` when a specific question is drilled into.
- Manages view mode via the `grader` Redux slice (`summary` ↔ `question`).

> **No legacy components are imported.** The old `AssignmentPicker` and `AssignmentSummary`
> (JSX renderers) were used only as a reference during design and are **not** used at runtime.

```tsx
// Simplified usage
<GraderV2 />
```

### GraderAssignmentPicker

**File:** `src/components/routes/GraderV2/components/GraderAssignmentPicker.tsx`

A new, fully-typed TypeScript replacement for the legacy `AssignmentPicker`. It:

- Uses `useGetAssignmentsQuery` from the modern RTK Query assignment API.
- Renders a PrimeReact `Dropdown` with filter/search support.
- Sorts assignments by due date (most recent first).
- Filters out assignments with empty names.
- Shows assignment name + formatted due date in each option row.
- Dispatches `graderActions.setSelectedAssignmentId` on selection.
- Shows loading spinner and error states.
- Supports clearing the selection via `showClear`.

**Functionality ported from legacy `AssignmentPicker`:**

| Legacy Feature                | GraderAssignmentPicker Equivalent       |
|-------------------------------|----------------------------------------|
| Dropdown with assignments     | ✅ PrimeReact `Dropdown` with filter   |
| Sorted by due date (desc)     | ✅ `sortedAssignments` memo            |
| Name + due date in options    | ✅ `AssignmentOptionTemplate`          |
| Filter / search               | ✅ `filter` + `filterPlaceholder`      |
| Dispatches selection to store | ✅ Uses `graderActions` (own slice)    |

### QuestionSummaryTable

**File:** `src/components/routes/GraderV2/components/QuestionSummaryTable.tsx`

A PrimeReact `DataTable` showing per-question statistics. This replaces the functionality
from the legacy `AssignmentSummary` component.

| Column      | Description                                    |
|-------------|------------------------------------------------|
| Question    | `qnumber` identifier                          |
| Title       | Human-readable question title                  |
| Type        | Badge showing the question type                |
| Average     | Progress bar + numeric average / max           |
| Min         | Minimum score                                  |
| Max         | Maximum score achieved                         |
| Submissions | Count of submitted / total students            |

**Functionality ported from legacy `AssignmentSummary`:**

| Legacy Feature                    | QuestionSummaryTable Equivalent         |
|-----------------------------------|-----------------------------------------|
| DataTable with question rows      | ✅ Sortable, paginated DataTable        |
| Title, points, due, avg, min, max | ✅ All columns + progress bar           |
| Row selection → drill into detail | ✅ `onQuestionSelect` callback          |
| Student response preview          | ✅ Handled by `QuestionReviewPanel`     |

Clicking a row dispatches `graderActions.setSelectedQuestionId` to drill in.

### QuestionReviewPanel

**File:** `src/components/routes/GraderV2/components/QuestionReviewPanel.tsx`

Orchestrator that:

1. Reads the selected question's type.
2. Uses `getDisplayCategory()` to decide which view to render.
3. Delegates to `TabularAnswerView`, `CodeAnswerView`, or `ParsonsAnswerView`.
4. Provides a breadcrumb to navigate back to the summary.

### TabularAnswerView

**File:** `src/components/routes/GraderV2/components/TabularAnswerView.tsx`

Renders answers for **mchoice**, **fillintheblank**, **shortanswer**, and similar types.

| Column    | Description                                           |
|-----------|-------------------------------------------------------|
| Student   | `sid` (sortable)                                      |
| Answer    | Raw answer text                                       |
| Auto-Grade| `Tag` showing Correct / Incorrect                     |
| Points    | Click-to-edit `InputNumber` (partial credit)          |
| Comment   | Click-to-edit `InputText`                             |
| Submitted | Timestamp                                             |

Editing is inline: click a points or comment cell to enter edit mode, blur to commit.

### CodeAnswerView

**File:** `src/components/routes/GraderV2/components/CodeAnswerView.tsx`

For **activecode** questions:

- **Student list table** – shows all students with a correct/incorrect badge.
- **Code review panel** – appears when a student is selected.
  - **History slider** (`Slider` component) – scrub through code snapshots.
  - **Code block** – syntax display of the snapshot.
  - **Output block** – compiler/test output at that snapshot.
  - **Grade editor** – `InputNumber` + `InputText` + Save button.

### ParsonsAnswerView

**File:** `src/components/routes/GraderV2/components/ParsonsAnswerView.tsx`

For **parsonsprob** questions:

- **Table** – each row shows a student with a preview of their first 3 blocks.
- **Detail dialog** – clicking a row opens a `Dialog` showing the full block layout with:
  - Numbered block indices.
  - Indentation visualization (margin-left).
  - Inline grade editor.

Block data is parsed from the `answer` field (JSON array of `{ content, indent }`).
Falls back gracefully to raw text if parsing fails.

---

## State Management

### Redux Slice (`grader.logic.ts`)

```typescript
interface GraderState {
  selectedAssignmentId: number | null;
  selectedQuestionId: number | null;
  viewMode: "summary" | "question";
}
```

**Actions:**

| Action                      | Description                                      |
|-----------------------------|--------------------------------------------------|
| `setSelectedAssignmentId`   | Sets assignment; resets question & view mode      |
| `setSelectedQuestionId`     | Sets question; switches to `"question"` view      |
| `setViewMode`               | Manually set the view mode                       |
| `resetGraderState`          | Resets to initial state                          |

**Selectors:**

| Selector                     | Returns                        |
|------------------------------|--------------------------------|
| `getSelectedAssignmentId`    | `number | null`                |
| `getSelectedQuestionId`      | `number | null`                |
| `getViewMode`                | `"summary" | "question"`       |

### RTK Query API (`grader.logic.api.ts`)

| Endpoint               | Type     | URL                                                       | Tags                              |
|------------------------|----------|-----------------------------------------------------------|-----------------------------------|
| `getQuestionSummaries` | Query    | `GET /assignment/instructor/grader/:id/summaries`          | `GraderSummaries`                 |
| `getStudentAnswers`    | Query    | `GET /assignment/instructor/grader/:id/question/:qid/answers` | `StudentAnswers`               |
| `getCodeHistory`       | Query    | `GET /assignment/instructor/grader/question/:qid/student/:sid/history` | `CodeHistory`           |
| `updateGrade`          | Mutation | `PUT /assignment/instructor/grader/grade`                  | Invalidates `StudentAnswers`, `GraderSummaries` |

The component also reuses the existing `useGetAssignmentsQuery` and `useGetAssignmentQuery`
hooks from `@store/assignment/assignment.logic.api.ts` for loading assignment data.

---

## Types

All types are defined in `src/types/grader.ts`:

| Type                          | Purpose                                                |
|-------------------------------|--------------------------------------------------------|
| `StudentAnswer`               | A single student's response to a question              |
| `CodeHistoryEntry`            | A snapshot of code at a point in time                  |
| `ParsonsStudentBlock`         | A single block (content + indent) in a Parsons answer  |
| `ParsonsStudentAnswer`        | `StudentAnswer` extended with parsed blocks            |
| `QuestionSummary`             | Aggregated statistics for one question                 |
| `GraderState`                 | Redux state shape                                      |
| `GraderViewMode`              | `"summary" \| "question"`                              |
| `Get*Request` / `Get*Response`| API request/response DTOs                              |
| `UpdateGradeRequest/Response` | Partial-credit update DTO                              |

---

## Utility Functions

**File:** `src/components/routes/GraderV2/graderUtils.ts`

| Function                | Signature                                              | Description                              |
|-------------------------|--------------------------------------------------------|------------------------------------------|
| `getDisplayCategory`    | `(type: ExerciseType \| string) => QuestionDisplayCategory` | Maps a question type to `"tabular"`, `"code"`, or `"parsons"` |
| `getQuestionTypeLabel`  | `(type: string) => string`                              | Returns a human-readable label           |

**Display category mapping:**

| Question Type      | Category   |
|--------------------|------------|
| `mchoice`          | `tabular`  |
| `fillintheblank`   | `tabular`  |
| `shortanswer`      | `tabular`  |
| `poll`             | `tabular`  |
| `matching`         | `tabular`  |
| `dragndrop`        | `tabular`  |
| `clickablearea`    | `tabular`  |
| `selectquestion`   | `tabular`  |
| `iframe`           | `tabular`  |
| `activecode`       | `code`     |
| `parsonsprob`      | `parsons`  |

---

## Question-Type Display Strategy

### 1. Tabular (Multiple Choice, Fill-in-the-Blank, Short Answer, etc.)

Student answers displayed in a sortable, paginated table. Each row = one student. Columns: Student, Answer, Auto-Grade status, Points (editable), Comment (editable), Timestamp.

**Partial credit:** Click the Points or Comment cell to enter edit mode. Values commit on blur.

### 2. Coding (Active Code)

Two-panel layout:

1. **Student list** – DataTable with student names, auto-grade status, points.
2. **Code review** – Shows selected student's code with a history slider.
   - Slider scrubs through chronological code snapshots.
   - Each snapshot shows the code and its compiler/test output.
   - Grade editor at the bottom with Save button.

### 3. Parsons Problems

Table with a block-preview column. Clicking opens a dialog with:

- Numbered, indented block visualization.
- Grade editor (points + comment + save).

---

## Relationship to Legacy Components

The legacy `AssignmentPicker` (`src/renderers/assignmentPicker.jsx`) and `AssignmentSummary`
(`src/renderers/assignmentSummary.jsx`) were used **only as references** during design.
They are **not imported, not used, and not modified** by GraderV2.

These legacy components are scheduled for removal. The GraderV2 interface provides full
replacements:

| Legacy Component     | GraderV2 Replacement                    | Status          |
|----------------------|-----------------------------------------|-----------------|
| `AssignmentPicker`   | `GraderAssignmentPicker`                | ✅ New TS code  |
| `AssignmentSummary`  | `QuestionSummaryTable` + `QuestionReviewPanel` | ✅ New TS code  |

### What was ported from legacy `AssignmentPicker`

- Fetches assignments from the server
- Dropdown with filter/search
- Options sorted by due date (most recent first)
- Each option shows name + formatted due date
- Dispatches to Redux store on selection

### What was ported from legacy `AssignmentSummary`

- Per-question summary table (title, points, average, min, max)
- Row selection for drill-down into student responses
- Student response table (sid, response, points)
- The new version adds: progress bars, question-type badges, paginated student views,
  inline partial-credit editing, code history slider, Parsons block visualization

### Files modified (none are legacy renderers)

| File             | Change                                         |
|------------------|-------------------------------------------------|
| `App.tsx`        | Route `/graderV2` added (lazy-loaded)           |
| `navUtils.ts`    | "Grader V2" item added to the navigation bar    |
| `rootReducer.ts` | `grader` slice + `graderAPI` reducer registered |
| `store.ts`       | `graderApi.middleware` added                    |

---

## API Endpoints

The following backend endpoints are expected (to be implemented server-side):

### `GET /assignment/instructor/grader/:assignmentId/summaries`

Returns per-question summary statistics.

**Response:**
```json
{
  "detail": {
    "summaries": [
      {
        "questionId": 1001,
        "qnumber": "q_mc_1",
        "title": "Capital of France",
        "questionType": "mchoice",
        "maxPoints": 10,
        "averageScore": 8.5,
        "minScore": 0,
        "maxScore": 10,
        "submissionCount": 28,
        "totalStudents": 30
      }
    ]
  }
}
```

### `GET /assignment/instructor/grader/:assignmentId/question/:questionId/answers`

Returns all student answers for a specific question.

**Response:**
```json
{
  "detail": {
    "answers": [
      {
        "id": 2001,
        "sid": "alice",
        "qnumber": "q_mc_1",
        "answer": "B",
        "correct": true,
        "points": 10,
        "maxPoints": 10,
        "comment": "",
        "timestamp": "2025-03-20T14:30:00",
        "questionType": "mchoice"
      }
    ]
  }
}
```

### `GET /assignment/instructor/grader/question/:questionId/student/:sid/history`

Returns the code history for a student on a coding question.

**Response:**
```json
{
  "detail": {
    "history": [
      {
        "id": 6001,
        "sid": "alice",
        "qnumber": "q_ac_1",
        "code": "def fibonacci(n):\n    pass",
        "timestamp": "2025-03-20T16:50:00",
        "output": ""
      }
    ]
  }
}
```

### `PUT /assignment/instructor/grader/grade`

Updates a student's grade (partial credit).

**Request:**
```json
{
  "answerId": 2001,
  "points": 7,
  "comment": "Partial credit for methodology"
}
```

**Response:**
```json
{
  "detail": {
    "success": true
  }
}
```

---

## Test Data & Test Suite

### Mock Data

**File:** `src/spec/mock/mockedGraderData.ts`

Contains comprehensive test fixtures covering **all 5 question types**:

| Dataset                          | Type             | Count | Notes                                    |
|----------------------------------|------------------|-------|------------------------------------------|
| `mockedQuestionSummaries`        | Summaries        | 5     | One per question type                    |
| `mockedMCAnswers`                | Multiple Choice  | 5     | Mix of correct/incorrect                 |
| `mockedFIBAnswers`               | Fill-in-Blank    | 4     | Includes partial credit (diana)          |
| `mockedShortAnswers`             | Short Answer     | 5     | Includes grader comments                 |
| `mockedCodeAnswers`              | Active Code      | 4     | Python fibonacci implementations         |
| `mockedParsonsAnswers`           | Parsons Problem  | 4     | JSON blocks + non-JSON fallback (diana)  |
| `mockedAliceCodeHistory`         | Code History     | 3     | Progressive code evolution               |
| `mockedBobCodeHistory`           | Code History     | 2     | Includes RecursionError output           |
| `mockedAnswersByQuestionId`      | Lookup map       | 5     | questionId → answers                     |
| `mockedCodeHistoryBySid`         | Lookup map       | 2     | sid → code history                       |

### Test Suite

| Test File                              | Tests | Description                              |
|----------------------------------------|-------|------------------------------------------|
| `GraderAssignmentPicker.spec.tsx`      | 4     | Loading, error, render, placeholder      |
| `graderUtils.spec.ts`                  | 16    | Display category + type labels           |
| `graderSlice.spec.ts`                  | 7     | Redux state transitions                  |
| `TabularAnswerView.spec.tsx`           | 2     | Component rendering + empty state        |
| `mockedGraderData.spec.ts`             | 19    | Structural integrity of all test data    |
| **Total**                              | **48**| ✅ All passing                           |

**Run tests:**
```bash
cd bases/rsptx/assignment_server_api/assignment_builder
npx vitest run src/components/routes/GraderV2/__tests__/
```

---

## Navigation

A **"Grader V2"** item has been added to the main navigation bar in `navUtils.ts`:

```typescript
{
  label: "Grader V2",
  icon: "pi pi-gauge",
  command: () => navigateToPath("graderV2")
}
```

This appears between "Assignment Builder" and "User" in the menu.

---

## Styling

**File:** `src/components/routes/GraderV2/GraderV2.module.css`

Uses CSS Modules for scoped styling. Key classes:

| Class                        | Purpose                                        |
|------------------------------|------------------------------------------------|
| `.graderContainer`           | Full-height flex column layout                 |
| `.graderHeader`              | Header with title                              |
| `.assignmentPickerWrapper`   | Constrains picker width                        |
| `.pickerDropdown`            | Full-width dropdown inside the wrapper         |
| `.pickerOption`              | Flex row for name + date in dropdown option    |
| `.pickerOptionName`          | Truncated name in option                       |
| `.pickerOptionDate`          | Right-aligned date in option                   |
| `.pickerLoading`             | Loading state layout                           |
| `.pickerError`               | Error state layout                             |
| `.selectedAssignmentInfo`    | Info banner for the selected assignment         |
| `.summarySection`            | Scrollable summary area                        |
| `.breadcrumb`                | Back-to-summary navigation                     |
| `.tabularContainer`          | Wrapper for the tabular DataTable              |
| `.gradeInput`                | Compact input for point values                 |
| `.commentInput`              | Full-width comment input                       |
| `.codeReviewContainer`       | Flex layout for code review                    |
| `.codeHistorySlider`         | Full-width history slider                      |
| `.codeBlock`                 | Dark-themed code display                       |
| `.codeOutput`                | Light-themed output display                    |
| `.parsonsBlockList`          | Vertical block layout                          |
| `.parsonsBlock`              | Individual block with index + content          |
| `.questionTypeBadge`         | Color-coded badge per question type            |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 8

### Development

```bash
cd bases/rsptx/assignment_server_api/assignment_builder

# Install dependencies (if not already)
npm install

# Start development server
npm start

# Navigate to /graderV2 in the app
```

### Testing

```bash
# Run all GraderV2 tests
npx vitest run src/components/routes/GraderV2/__tests__/

# Run with coverage
npx vitest run --coverage.enabled src/components/routes/GraderV2/__tests__/

# Run all project tests
npm test
```

### Backend Integration

The frontend expects the API endpoints listed in the [API Endpoints](#api-endpoints) section.
Until the backend is implemented, you can use the mock data from `src/spec/mock/mockedGraderData.ts`
with [MSW](https://mswjs.io/) or similar request-mocking libraries.


