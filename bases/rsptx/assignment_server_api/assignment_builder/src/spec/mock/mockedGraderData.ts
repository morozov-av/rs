/**
 * Comprehensive mock / test data for the GraderV2 interface.
 *
 * Covers all supported question types:
 * - Multiple Choice (mchoice)
 * - Fill-in-the-Blank (fillintheblank)
 * - Short Answer (shortanswer)
 * - Active Code (activecode)
 * - Parsons Problem (parsonsprob)
 */
import {
  CodeHistoryEntry,
  GetCodeHistoryResponse,
  GetQuestionSummariesResponse,
  GetStudentAnswersResponse,
  ParsonsStudentBlock,
  QuestionSummary,
  StudentAnswer
} from "@/types/grader";

// ---------------------------------------------------------------------------
// Question Summaries (assignment-level overview)
// ---------------------------------------------------------------------------

export const mockedQuestionSummaries: QuestionSummary[] = [
  {
    questionId: 1001,
    qnumber: "q_mc_1",
    title: "Capital of France",
    questionType: "mchoice",
    maxPoints: 10,
    averageScore: 8.5,
    minScore: 0,
    maxScore: 10,
    submissionCount: 28,
    totalStudents: 30
  },
  {
    questionId: 1002,
    qnumber: "q_fib_1",
    title: "Python print() syntax",
    questionType: "fillintheblank",
    maxPoints: 5,
    averageScore: 3.2,
    minScore: 0,
    maxScore: 5,
    submissionCount: 30,
    totalStudents: 30
  },
  {
    questionId: 1003,
    qnumber: "q_sa_1",
    title: "Explain recursion",
    questionType: "shortanswer",
    maxPoints: 20,
    averageScore: 14.0,
    minScore: 2,
    maxScore: 20,
    submissionCount: 27,
    totalStudents: 30
  },
  {
    questionId: 1004,
    qnumber: "q_ac_1",
    title: "Fibonacci function",
    questionType: "activecode",
    maxPoints: 25,
    averageScore: 18.7,
    minScore: 0,
    maxScore: 25,
    submissionCount: 29,
    totalStudents: 30
  },
  {
    questionId: 1005,
    qnumber: "q_parsons_1",
    title: "Sort a list",
    questionType: "parsonsprob",
    maxPoints: 15,
    averageScore: 11.3,
    minScore: 0,
    maxScore: 15,
    submissionCount: 26,
    totalStudents: 30
  }
];

export const mockedQuestionSummariesResponse: GetQuestionSummariesResponse = {
  summaries: mockedQuestionSummaries
};

// ---------------------------------------------------------------------------
// Multiple-Choice answers
// ---------------------------------------------------------------------------

export const mockedMCAnswers: StudentAnswer[] = [
  {
    id: 2001,
    sid: "alice",
    qnumber: "q_mc_1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T14:30:00",
    questionType: "mchoice"
  },
  {
    id: 2002,
    sid: "bob",
    qnumber: "q_mc_1",
    answer: "A",
    correct: false,
    points: 0,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T14:31:00",
    questionType: "mchoice"
  },
  {
    id: 2003,
    sid: "charlie",
    qnumber: "q_mc_1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T14:29:00",
    questionType: "mchoice"
  },
  {
    id: 2004,
    sid: "diana",
    qnumber: "q_mc_1",
    answer: "C",
    correct: false,
    points: 0,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T14:35:00",
    questionType: "mchoice"
  },
  {
    id: 2005,
    sid: "eve",
    qnumber: "q_mc_1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T14:28:00",
    questionType: "mchoice"
  }
];

export const mockedMCAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedMCAnswers
};

// ---------------------------------------------------------------------------
// Fill-in-the-Blank answers
// ---------------------------------------------------------------------------

export const mockedFIBAnswers: StudentAnswer[] = [
  {
    id: 3001,
    sid: "alice",
    qnumber: "q_fib_1",
    answer: 'print("Hello")',
    correct: true,
    points: 5,
    maxPoints: 5,
    comment: "",
    timestamp: "2025-03-20T15:00:00",
    questionType: "fillintheblank"
  },
  {
    id: 3002,
    sid: "bob",
    qnumber: "q_fib_1",
    answer: "echo Hello",
    correct: false,
    points: 0,
    maxPoints: 5,
    comment: "",
    timestamp: "2025-03-20T15:01:00",
    questionType: "fillintheblank"
  },
  {
    id: 3003,
    sid: "charlie",
    qnumber: "q_fib_1",
    answer: 'print("Hello")',
    correct: true,
    points: 5,
    maxPoints: 5,
    comment: "",
    timestamp: "2025-03-20T15:02:00",
    questionType: "fillintheblank"
  },
  {
    id: 3004,
    sid: "diana",
    qnumber: "q_fib_1",
    answer: "printf('Hello')",
    correct: false,
    points: 2,
    maxPoints: 5,
    comment: "Close – right idea, wrong syntax",
    timestamp: "2025-03-20T15:05:00",
    questionType: "fillintheblank"
  }
];

export const mockedFIBAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedFIBAnswers
};

// ---------------------------------------------------------------------------
// Short-Answer answers
// ---------------------------------------------------------------------------

export const mockedShortAnswers: StudentAnswer[] = [
  {
    id: 4001,
    sid: "alice",
    qnumber: "q_sa_1",
    answer:
      "Recursion is when a function calls itself to break a problem into smaller sub-problems until a base case is reached.",
    correct: true,
    points: 20,
    maxPoints: 20,
    comment: "Excellent explanation.",
    timestamp: "2025-03-20T16:10:00",
    questionType: "shortanswer"
  },
  {
    id: 4002,
    sid: "bob",
    qnumber: "q_sa_1",
    answer: "Recursion is a loop.",
    correct: false,
    points: 5,
    maxPoints: 20,
    comment: "Too vague – needs more detail.",
    timestamp: "2025-03-20T16:11:00",
    questionType: "shortanswer"
  },
  {
    id: 4003,
    sid: "charlie",
    qnumber: "q_sa_1",
    answer:
      "Recursion means a function calling itself. It must have a base case to stop. Example: factorial(n) = n * factorial(n-1).",
    correct: true,
    points: 18,
    maxPoints: 20,
    comment: "Good, minor detail missed.",
    timestamp: "2025-03-20T16:15:00",
    questionType: "shortanswer"
  },
  {
    id: 4004,
    sid: "diana",
    qnumber: "q_sa_1",
    answer: "I don't know.",
    correct: false,
    points: 0,
    maxPoints: 20,
    comment: "",
    timestamp: "2025-03-20T16:20:00",
    questionType: "shortanswer"
  },
  {
    id: 4005,
    sid: "eve",
    qnumber: "q_sa_1",
    answer:
      "A recursive function solves a problem by reducing it to smaller instances of itself. It has a base case (the simplest case) and a recursive case.",
    correct: true,
    points: 19,
    maxPoints: 20,
    comment: "",
    timestamp: "2025-03-20T16:12:00",
    questionType: "shortanswer"
  }
];

export const mockedShortAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedShortAnswers
};

// ---------------------------------------------------------------------------
// Active-Code answers
// ---------------------------------------------------------------------------

export const mockedCodeAnswers: StudentAnswer[] = [
  {
    id: 5001,
    sid: "alice",
    qnumber: "q_ac_1",
    answer:
      "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    correct: true,
    points: 25,
    maxPoints: 25,
    comment: "",
    timestamp: "2025-03-20T17:00:00",
    questionType: "activecode"
  },
  {
    id: 5002,
    sid: "bob",
    qnumber: "q_ac_1",
    answer: "def fibonacci(n):\n    return n + fibonacci(n-1)",
    correct: false,
    points: 10,
    maxPoints: 25,
    comment: "Missing base case",
    timestamp: "2025-03-20T17:05:00",
    questionType: "activecode"
  },
  {
    id: 5003,
    sid: "charlie",
    qnumber: "q_ac_1",
    answer:
      "def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
    correct: true,
    points: 25,
    maxPoints: 25,
    comment: "Iterative – nice!",
    timestamp: "2025-03-20T17:10:00",
    questionType: "activecode"
  },
  {
    id: 5004,
    sid: "diana",
    qnumber: "q_ac_1",
    answer: "def fibonacci(n):\n    pass",
    correct: false,
    points: 2,
    maxPoints: 25,
    comment: "Only stub submitted",
    timestamp: "2025-03-20T17:20:00",
    questionType: "activecode"
  }
];

export const mockedCodeAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedCodeAnswers
};

// ---------------------------------------------------------------------------
// Code history for alice on q_ac_1
// ---------------------------------------------------------------------------

export const mockedAliceCodeHistory: CodeHistoryEntry[] = [
  {
    id: 6001,
    sid: "alice",
    qnumber: "q_ac_1",
    code: "def fibonacci(n):\n    pass",
    timestamp: "2025-03-20T16:50:00",
    output: ""
  },
  {
    id: 6002,
    sid: "alice",
    qnumber: "q_ac_1",
    code: "def fibonacci(n):\n    if n <= 1:\n        return n",
    timestamp: "2025-03-20T16:52:00",
    output: "Test 1 passed, Test 2 failed"
  },
  {
    id: 6003,
    sid: "alice",
    qnumber: "q_ac_1",
    code: "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    timestamp: "2025-03-20T17:00:00",
    output: "All tests passed ✓"
  }
];

export const mockedAliceCodeHistoryResponse: GetCodeHistoryResponse = {
  history: mockedAliceCodeHistory
};

// ---------------------------------------------------------------------------
// Code history for bob on q_ac_1
// ---------------------------------------------------------------------------

export const mockedBobCodeHistory: CodeHistoryEntry[] = [
  {
    id: 6101,
    sid: "bob",
    qnumber: "q_ac_1",
    code: "def fibonacci(n):\n    return n",
    timestamp: "2025-03-20T17:01:00",
    output: "Test 1 failed"
  },
  {
    id: 6102,
    sid: "bob",
    qnumber: "q_ac_1",
    code: "def fibonacci(n):\n    return n + fibonacci(n-1)",
    timestamp: "2025-03-20T17:05:00",
    output: "RecursionError: maximum recursion depth exceeded"
  }
];

export const mockedBobCodeHistoryResponse: GetCodeHistoryResponse = {
  history: mockedBobCodeHistory
};

// ---------------------------------------------------------------------------
// Parsons-Problem answers
// ---------------------------------------------------------------------------

const aliceParsonsBlocks: ParsonsStudentBlock[] = [
  { content: "def sort_list(lst):", indent: 0 },
  { content: "for i in range(len(lst)):", indent: 1 },
  { content: "for j in range(i+1, len(lst)):", indent: 2 },
  { content: "if lst[j] < lst[i]:", indent: 3 },
  { content: "lst[i], lst[j] = lst[j], lst[i]", indent: 4 },
  { content: "return lst", indent: 1 }
];

const bobParsonsBlocks: ParsonsStudentBlock[] = [
  { content: "def sort_list(lst):", indent: 0 },
  { content: "for i in range(len(lst)):", indent: 1 },
  { content: "if lst[j] < lst[i]:", indent: 2 },
  { content: "for j in range(i+1, len(lst)):", indent: 2 },
  { content: "lst[i], lst[j] = lst[j], lst[i]", indent: 3 },
  { content: "return lst", indent: 1 }
];

const charlieParsonsBlocks: ParsonsStudentBlock[] = [
  { content: "def sort_list(lst):", indent: 0 },
  { content: "for i in range(len(lst)):", indent: 1 },
  { content: "for j in range(i+1, len(lst)):", indent: 2 },
  { content: "if lst[j] < lst[i]:", indent: 3 },
  { content: "lst[i], lst[j] = lst[j], lst[i]", indent: 4 },
  { content: "return lst", indent: 1 }
];

export const mockedParsonsAnswers: StudentAnswer[] = [
  {
    id: 7001,
    sid: "alice",
    qnumber: "q_parsons_1",
    answer: JSON.stringify(aliceParsonsBlocks),
    correct: true,
    points: 15,
    maxPoints: 15,
    comment: "",
    timestamp: "2025-03-20T18:00:00",
    questionType: "parsonsprob"
  },
  {
    id: 7002,
    sid: "bob",
    qnumber: "q_parsons_1",
    answer: JSON.stringify(bobParsonsBlocks),
    correct: false,
    points: 8,
    maxPoints: 15,
    comment: "Swapped the inner for-loop and the if-statement",
    timestamp: "2025-03-20T18:05:00",
    questionType: "parsonsprob"
  },
  {
    id: 7003,
    sid: "charlie",
    qnumber: "q_parsons_1",
    answer: JSON.stringify(charlieParsonsBlocks),
    correct: true,
    points: 15,
    maxPoints: 15,
    comment: "",
    timestamp: "2025-03-20T18:02:00",
    questionType: "parsonsprob"
  },
  {
    id: 7004,
    sid: "diana",
    qnumber: "q_parsons_1",
    answer: "I couldn't figure it out",
    correct: false,
    points: 0,
    maxPoints: 15,
    comment: "No valid block arrangement submitted",
    timestamp: "2025-03-20T18:25:00",
    questionType: "parsonsprob"
  }
];

export const mockedParsonsAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedParsonsAnswers
};

// ---------------------------------------------------------------------------
// Helper map: questionId → mocked answers response
// ---------------------------------------------------------------------------

export const mockedAnswersByQuestionId: Record<number, GetStudentAnswersResponse> = {
  1001: mockedMCAnswersResponse,
  1002: mockedFIBAnswersResponse,
  1003: mockedShortAnswersResponse,
  1004: mockedCodeAnswersResponse,
  1005: mockedParsonsAnswersResponse
};

// ---------------------------------------------------------------------------
// Helper map: sid → mocked code history response
// ---------------------------------------------------------------------------

export const mockedCodeHistoryBySid: Record<string, GetCodeHistoryResponse> = {
  alice: mockedAliceCodeHistoryResponse,
  bob: mockedBobCodeHistoryResponse
};

