# GraderV2 — Manual Testing Workflow Guide

> Step-by-step instructions for testing the grading interface through the **real UI**,  
> switching between instructor and student accounts — no direct database manipulation.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Account Setup](#2-account-setup)
   - [Create an Instructor Account](#21-create-an-instructor-account)
   - [Create Student Accounts](#22-create-student-accounts)
3. [Workflow A: Create Assignment (Instructor)](#3-workflow-a-create-assignment-instructor)
4. [Workflow B: Submit Answers (Students)](#4-workflow-b-submit-answers-students)
   - [Student 1 — The Perfect Student](#41-student-1--the-perfect-student)
   - [Student 2 — The Average Student](#42-student-2--the-average-student)
   - [Student 3 — The Struggling Student](#43-student-3--the-struggling-student)
5. [Workflow C: Grade with GraderV2 (Instructor)](#5-workflow-c-grade-with-graderv2-instructor)
   - [Open GraderV2](#51-open-graderv2)
   - [Review Summary Table](#52-review-summary-table)
   - [Grade Multiple Choice / Fill-in-the-Blank (Tabular)](#53-grade-multiple-choice--fill-in-the-blank-tabular)
   - [Grade Short Answer (Tabular + Manual)](#54-grade-short-answer-tabular--manual)
   - [Grade Active Code (Code History)](#55-grade-active-code-code-history)
   - [Grade Parsons Problem (Preview Dialog)](#56-grade-parsons-problem-preview-dialog)
6. [Workflow D: Verify Updated Grades](#6-workflow-d-verify-updated-grades)
7. [Full Test Scenario — Step by Step](#7-full-test-scenario--step-by-step)
8. [Tips & Troubleshooting](#8-tips--troubleshooting)

---

## 1. Prerequisites

- All Docker containers are running (`docker compose --profile basic up -d`)
- Vite dev server is running:
  ```bash
  cd bases/rsptx/assignment_server_api/assignment_builder
  npm install && npm start
  # → http://localhost:5173
  ```
- You have **two browser windows** (or use incognito/private mode) to switch between instructor and student sessions without logging out.

**Base URL:** `http://localhost` (nginx) — used for login, registration, student assignment pages.  
**Assignment Builder URL:** `http://localhost:5173` — used for the instructor grading interface.

---

## 2. Account Setup

### 2.1 Create an Instructor Account

If you don't already have an instructor account in the `overview` course:

1. Open `http://localhost/runestone/default/user/register` in your browser.
2. Fill in the registration form:
   - **Username:** `test_instructor`
   - **Email:** `instructor@test.com`
   - **First Name:** `Test`
   - **Last Name:** `Instructor`
   - **Password:** `Testpass1!`
   - **Course Name:** `overview`
3. Click **Register**.
4. Make this user an instructor — run in terminal:
   ```bash
   docker exec rs-db-1 psql -U runestone -d runestone_dev -c "
     INSERT INTO course_instructor (course, instructor)
     SELECT c.id, u.id
     FROM courses c, auth_user u
     WHERE c.course_name = 'overview' AND u.username = 'test_instructor'
     ON CONFLICT DO NOTHING;

     INSERT INTO auth_membership (user_id, group_id)
     SELECT u.id, g.id
     FROM auth_user u, auth_group g
     WHERE u.username = 'test_instructor' AND g.role = 'instructor'
     ON CONFLICT DO NOTHING;
   "
   ```
5. Log out and log back in — you should now see the instructor menu.

> **Note:** This is the only place where a DB command is needed. There is no UI to self-promote to instructor.

### 2.2 Create Student Accounts

Create **3 student accounts** through the registration page. For each student:

1. Open `http://localhost/runestone/default/user/register` (use a different browser or incognito window).
2. Register each student:

| Username | Email | First Name | Last Name | Password | Course |
|----------|-------|------------|-----------|----------|--------|
| `student_alice` | alice@test.com | Alice | Anderson | `Testpass1!` | `overview` |
| `student_bob` | bob@test.com | Bob | Brown | `Testpass1!` | `overview` |
| `student_carol` | carol@test.com | Carol | Clark | `Testpass1!` | `overview` |

3. After registration, each student is automatically enrolled in the `overview` course.

---

## 3. Workflow A: Create Assignment (Instructor)

> **Goal:** Create an assignment with multiple question types that students will answer.

### Step 1: Log in as instructor

1. Open `http://localhost/runestone/default/user/login`.
2. Log in as `test_instructor` / `Testpass1!`.

### Step 2: Open Assignment Builder

1. Navigate to `http://localhost:5173/assignment` (or click "Assignment Builder" in the nav bar).
2. You should see the assignment list.

### Step 3: Create a new assignment

1. Click **"+ New Assignment"** button.
2. Fill in:
   - **Name:** `Grader Test Assignment`
   - **Description:** `Testing all question types for grader`
   - **Points:** `100`
   - **Due Date:** pick a date in the future (e.g., tomorrow)
   - **Released:** ✅ checked (so students can see it)
   - **Visible:** ✅ checked
3. Save the assignment.

### Step 4: Add questions to the assignment

Add questions of different types from the question bank. Use the **"Choose Exercises"** tab to search for existing questions. If the seed data has been loaded, you can find questions by searching for `grader_`:

| Question to add | Type | Points | How to find |
|----------------|------|--------|-------------|
| `grader_mc_capitals` | Multiple Choice | 10 | Search "grader_mc" |
| `grader_fitb_html` | Fill-in-the-Blank | 10 | Search "grader_fitb" |
| `grader_sa_explain` | Short Answer | 20 | Search "grader_sa" |
| `grader_ac_fibonacci` | Active Code | 30 | Search "grader_ac" |
| `grader_parsons_swap` | Parsons Problem | 15 | Search "grader_parsons" |

For each question:
1. Click the **"Choose Exercises"** tab.
2. Search for the question by name.
3. Click the **+** or add button to add it to the assignment.
4. Set the points value.
5. Set autograde method (pct_correct for MC/FITB/Parsons, unittest for code, manual for SA).

> **If seed questions don't exist:** Run `docker exec -i rs-db-1 psql -U runestone -d runestone_dev < seed_grader_test_data.sql` once to populate the question bank. This only creates questions — students and answers are NOT created.

### Step 5: Verify the assignment

1. Click the **Preview (👁)** button next to the assignment in the list to open the student view.
2. Verify all 5 questions appear and render correctly.
3. Close the preview tab.

---

## 4. Workflow B: Submit Answers (Students)

> **Goal:** Log in as each student and submit answers to the assignment.  
> Use a separate browser or incognito window for each student.

### 4.1 Student 1 — The Perfect Student (Alice)

1. Open a **new incognito/private browser window**.
2. Go to `http://localhost/runestone/default/user/login`.
3. Log in as `student_alice` / `Testpass1!`.
4. Navigate to `http://localhost/assignment/student/chooseAssignment`.
5. Find **"Grader Test Assignment"** in the list and click on it.
6. Answer each question **correctly**:

| Question | What to do |
|----------|------------|
| **MC (Capitals)** | Select "Paris" → Click **"Check Me"** |
| **FITB (HTML)** | Type `p` in the blank → Click **"Check Me"** |
| **Short Answer (List vs Tuple)** | Write a detailed answer: *"A list is mutable and uses square brackets [], while a tuple is immutable and uses parentheses (). Lists support append, insert, remove; tuples are fixed after creation."* → Click **"Save"** |
| **Active Code (Fibonacci)** | Write the correct solution (see below) → Click **"Run"** → Verify tests pass |
| **Parsons (Swap)** | Drag blocks into correct order: `temp = a` → `a = b` → `b = temp` → Click **"Check Me"** |

**Fibonacci solution for Alice:**
```python
def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```

7. Click **"Mark Finished"** at the top of the page.
8. **Log out** (or close the incognito window).

### 4.2 Student 2 — The Average Student (Bob)

1. Open a **new incognito/private browser window**.
2. Log in as `student_bob` / `Testpass1!`.
3. Go to `http://localhost/assignment/student/chooseAssignment`.
4. Open **"Grader Test Assignment"**.
5. Answer with **some mistakes**:

| Question | What to do |
|----------|------------|
| **MC (Capitals)** | Select "London" (wrong) → Click **"Check Me"** |
| **FITB (HTML)** | Type `div` (wrong) → Click **"Check Me"** |
| **Short Answer** | Write a brief answer: *"Lists use brackets and tuples use parentheses."* → Click **"Save"** |
| **Active Code (Fibonacci)** | First attempt: write buggy code (see below) → Click **"Run"** → See error. Then fix partially → Click **"Run"** again. |
| **Parsons (Swap)** | Put blocks in wrong order: `a = b` → `b = temp` → `temp = a` → Click **"Check Me"** |

**Fibonacci — Bob's first attempt (buggy):**
```python
def fibonacci(n):
    return fibonacci(n-1) + fibonacci(n-2)
```
→ Run → RecursionError

**Fibonacci — Bob's second attempt (partial fix):**
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```
→ Run → Some tests pass

> **Important:** Bob clicking "Run" twice creates **2 code history snapshots** that the instructor will see in the history slider.

6. Click **"Mark Finished"**.
7. **Log out**.

### 4.3 Student 3 — The Struggling Student (Carol)

1. Open a **new incognito/private browser window**.
2. Log in as `student_carol` / `Testpass1!`.
3. Go to `http://localhost/assignment/student/chooseAssignment`.
4. Open **"Grader Test Assignment"**.
5. Answer **only some questions** (partial submission):

| Question | What to do |
|----------|------------|
| **MC (Capitals)** | Select "Berlin" (wrong) → Click **"Check Me"** |
| **FITB (HTML)** | **Skip — do not answer at all** |
| **Short Answer** | Write: *"I don't know"* → Click **"Save"** |
| **Active Code (Fibonacci)** | Write: `def fibonacci(n): pass` → Click **"Run"** → All tests fail. **Leave it.** |
| **Parsons (Swap)** | **Skip — do not answer at all** |

6. Click **"Mark In Progress"** (do NOT mark finished — simulates incomplete work).
7. **Log out**.

---

## 5. Workflow C: Grade with GraderV2 (Instructor)

> **Goal:** Log in as the instructor, open GraderV2, review all student submissions,  
> and assign grades using the grading interface.

### 5.1 Open GraderV2

1. Open your main browser (non-incognito).
2. Go to `http://localhost/runestone/default/user/login`.
3. Log in as `test_instructor` / `Testpass1!`.
4. Navigate to `http://localhost:5173/graderV2`.
5. You should see the **GraderV2** page with the assignment picker dropdown.

### 5.2 Review Summary Table

1. In the **assignment dropdown**, search for "Grader Test Assignment" and select it.
2. **Verify the info banner** shows:
   - Assignment name: "Grader Test Assignment"
   - Total points: 100 (or whatever you set)
   - Due date: the date you chose
3. **Verify the QuestionSummaryTable** shows 5 rows:

| What to check | Expected |
|---------------|----------|
| Row count | 5 question rows |
| Question column | Shows qnumber (Q-1, Q-2, etc.) |
| Title column | Shows question titles |
| Type column | Badges: mchoice, fillintheblank, shortanswer, activecode, parsonsprob |
| Submissions column | "2/3" or "3/3" depending on who answered |
| Average column | Progress bar filled proportionally |

4. **Click on column headers** to verify sorting works.

### 5.3 Grade Multiple Choice / Fill-in-the-Blank (Tabular)

1. **Click the MC question row** (grader_mc_capitals) to drill down.
2. You should see **TabularAnswerView** with a table:

| Student | Answer | Auto-Grade | Points | Comment |
|---------|--------|------------|--------|---------|
| student_alice | 0 (Paris) | ✅ Correct | 10/10 | |
| student_bob | 1 (London) | ❌ Incorrect | 0/10 | |
| student_carol | 2 (Berlin) | ❌ Incorrect | 0/10 | |

3. **Test inline editing:**
   - Click on the **Points** cell for `student_bob` → change to `5` (partial credit) → click away (blur).
   - Verify a network request goes out (check DevTools → Network tab for `PUT /assignment/instructor/grader/grade`).
   - Click on the **Comment** cell for `student_bob` → type "Partial credit for attempt" → click away.
4. **Click "← Back to Summary"** to return.
5. **Click the FITB question row** → verify `student_carol` has no answer (or empty).

### 5.4 Grade Short Answer (Tabular + Manual)

1. **Click the Short Answer row** (grader_sa_explain) in the summary table.
2. You should see the full text answers:

| Student | Answer | Points |
|---------|--------|--------|
| student_alice | "A list is mutable and uses square brackets..." | (ungraded or auto) |
| student_bob | "Lists use brackets and tuples use parentheses." | (ungraded) |
| student_carol | "I don't know" | (ungraded) |

3. **Grade each student:**
   - `student_alice`: Click Points → enter `18` → Comment: "Good but could mention performance differences" → blur.
   - `student_bob`: Click Points → enter `10` → Comment: "Brief but captures the basics" → blur.
   - `student_carol`: Click Points → enter `2` → Comment: "Please make an effort" → blur.
4. Go back to summary.

### 5.5 Grade Active Code (Code History)

1. **Click the Active Code row** (grader_ac_fibonacci).
2. You should see **CodeAnswerView** — a student list table.
3. **Select `student_alice`:**
   - The **code review panel** should appear on the right.
   - There should be a **history slider** with 1 snapshot.
   - The code should show her correct fibonacci implementation.
   - Output should show "All tests passed" (or similar).
4. **Select `student_bob`:**
   - The history slider should show **2 snapshots** (buggy version → fixed version).
   - **Drag the slider** to snapshot 1 → verify you see the buggy code with RecursionError.
   - Drag to snapshot 2 → see the fixed code with partial test results.
5. **Grade `student_bob`:**
   - In the grade editor below the code: set Points to `15`, Comment to "Good progress, but recursive solution is slow".
   - Click **Save**.
6. **Select `student_carol`:**
   - Should show `def fibonacci(n): pass` — all tests failed.
   - Grade: Points `5`, Comment "Function stub only — no implementation".
   - Click **Save**.
7. Go back to summary.

### 5.6 Grade Parsons Problem (Preview Dialog)

1. **Click the Parsons row** (grader_parsons_swap).
2. You should see **ParsonsAnswerView** — a table of students.
3. **Verify the table shows:**
   - `student_alice`: Correct, 15/15 (auto-graded)
   - `student_bob`: Incorrect, 0/15
   - `student_carol`: No answer (or not shown)
4. **Click on `student_alice`'s row:**
   - A **Dialog** (modal window) should open.
   - Inside the dialog: a **Runestone Parsons preview** component should render, showing the question with Alice's answer (blocks in correct order).
   - Below the preview: **Grade editor** (Points input, Comment input, Save button).
   - Close the dialog (click X or click outside).
5. **Click on `student_bob`'s row:**
   - The dialog should show the Parsons preview with Bob's **incorrect** block arrangement.
   - **Edit the grade:**
     - Points: `5` (partial credit — he had the right blocks but wrong order).
     - Comment: "Blocks are correct but order is wrong."
     - Click **Save**.
   - The dialog should close.
6. **Verify the table updated** — Bob should now show 5/15.
7. Go back to summary.

---

## 6. Workflow D: Verify Updated Grades

> **Goal:** Confirm that all grade changes persisted.

### As Instructor

1. Still in GraderV2, **reload the page** (Ctrl+R / Cmd+R).
2. Select "Grader Test Assignment" again.
3. **Check the summary table** — averages should reflect the grades you assigned.
4. **Drill into each question** and verify:
   - Points you entered are still there.
   - Comments are preserved.

### As Student (Optional verification)

1. Log in as `student_bob` in an incognito window.
2. Go to `http://localhost/assignment/student/chooseAssignment`.
3. Open "Grader Test Assignment".
4. Check if the assignment shows the updated scores next to each question (scores are visible when the instructor marks the assignment as graded).

---

## 7. Full Test Scenario — Step by Step

Here is the complete sequence as a checklist you can print and follow:

### Phase 1: Setup (5 minutes)

- [ ] Docker containers are running (`docker ps` shows db, book, assignment, nginx, etc.)
- [ ] Vite dev server is running on `http://localhost:5173`
- [ ] Instructor account `test_instructor` exists and has instructor role
- [ ] Student accounts `student_alice`, `student_bob`, `student_carol` are registered in `overview` course

### Phase 2: Create Assignment — Instructor (10 minutes)

- [ ] Log in as `test_instructor`
- [ ] Open Assignment Builder at `http://localhost:5173/assignment`
- [ ] Create "Grader Test Assignment" with 5 questions (MC, FITB, SA, ActiveCode, Parsons)
- [ ] Set due date in the future, released = true, visible = true
- [ ] Preview the assignment to verify all questions render

### Phase 3: Submit Answers — Students (15 minutes)

- [ ] **Alice** (incognito window 1): Log in → open assignment → answer all 5 questions correctly → Mark Finished → Log out
- [ ] **Bob** (incognito window 2): Log in → open assignment → answer all 5 with mistakes, click Run twice for fibonacci → Mark Finished → Log out
- [ ] **Carol** (incognito window 3): Log in → open assignment → answer only 3 of 5 (skip FITB and Parsons) → Mark In Progress → Log out

### Phase 4: Grade — Instructor (15 minutes)

- [ ] Log in as `test_instructor`
- [ ] Open `http://localhost:5173/graderV2`
- [ ] Select "Grader Test Assignment" from dropdown
- [ ] **Summary Table**: verify 5 questions, correct submission counts
- [ ] **MC question**: drill down → verify 3 student answers → change Bob's score to 5 → add comment → go back
- [ ] **FITB question**: drill down → verify Carol has no answer → go back
- [ ] **Short Answer**: drill down → grade all 3 students with different scores and comments → go back
- [ ] **Active Code**: drill down → select Alice (verify code + test output) → select Bob (verify 2 history snapshots in slider) → grade Bob and Carol → go back
- [ ] **Parsons**: drill down → click Alice's row → verify dialog opens with Runestone preview → close → click Bob's row → grade with partial credit 5/15 → Save → verify table updates → go back

### Phase 5: Verify (5 minutes)

- [ ] Reload GraderV2 page → select same assignment → verify all grades persisted
- [ ] Summary averages reflect the new grades
- [ ] (Optional) Log in as student → verify score is visible on assignment page

---

## 8. Tips & Troubleshooting

### How to use multiple accounts simultaneously

Use **browser profiles** or **incognito/private windows**:
- **Main browser window:** Instructor session
- **Incognito Window 1:** Student Alice
- **Incognito Window 2:** Student Bob
- **Incognito Window 3:** Student Carol

Each incognito window has its own cookie store, so you can be logged in as different users at the same time.

### Common issues

| Problem | Solution |
|---------|----------|
| Student can't see the assignment | Make sure the assignment is **released** and **visible**, and the due date is in the future |
| Questions don't render on assignment page | Check that the question's `htmlsrc` is not empty. Look in DevTools console for JS errors. |
| GraderV2 shows "No summaries" | The backend API (`/assignment/instructor/grader/:id/summaries`) may not be implemented yet. Check the Network tab for 404/500. |
| Parsons preview dialog shows "Preview not available" | The `htmlsrc` fetch failed. Check that `GET /ns/assessment/htmlsrc?acid=<question_name>` returns 200 with HTML. |
| Grade Save button does nothing | Check Network tab for `PUT /assignment/instructor/grader/grade` — it may be returning an error. |
| Can't log in as instructor | Verify the user has entries in both `course_instructor` and `auth_membership` tables (see Section 2.1). |
| History slider shows only 1 snapshot for Bob | Bob must click "Run" at least twice with different code to generate multiple history entries. |

### Useful URLs

| Page | URL |
|------|-----|
| Student Registration | `http://localhost/runestone/default/user/register` |
| Login | `http://localhost/runestone/default/user/login` |
| Student Assignment List | `http://localhost/assignment/student/chooseAssignment` |
| Student Assignment Page | `http://localhost/assignment/student/doAssignment?assignment_id=<ID>` |
| Assignment Builder (Instructor) | `http://localhost:5173/assignment` |
| **GraderV2 (Instructor)** | `http://localhost:5173/graderV2` |
| Admin Gradebook | `http://localhost/admin/instructor/gradebook` |
| Admin Manage Students | `http://localhost/admin/instructor/manage_students` |

