/**
 * Comprehensive mock / test data for the GraderV2 interface.
 *
 * Covers ALL supported question types:
 * - Multiple Choice (mchoice)
 * - Fill-in-the-Blank (fillintheblank)
 * - Short Answer (shortanswer)
 * - Active Code (activecode)
 * - Parsons Problem (parsonsprob)
 * - Poll (poll)
 * - Drag & Drop (dragndrop)
 * - Clickable Area (clickablearea)
 * - Matching (matching)
 * - Select Question (selectquestion)
 * - Iframe (iframe)
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
  },
  {
    questionId: 1006,
    qnumber: "q_poll_1",
    title: "Preferred programming language",
    questionType: "poll",
    maxPoints: 1,
    averageScore: 1.0,
    minScore: 1,
    maxScore: 1,
    submissionCount: 30,
    totalStudents: 30
  },
  {
    questionId: 1007,
    qnumber: "q_dnd_1",
    title: "Match data structures to descriptions",
    questionType: "dragndrop",
    maxPoints: 10,
    averageScore: 7.2,
    minScore: 0,
    maxScore: 10,
    submissionCount: 28,
    totalStudents: 30
  },
  {
    questionId: 1008,
    qnumber: "q_ca_1",
    title: "Click on the syntax errors",
    questionType: "clickablearea",
    maxPoints: 8,
    averageScore: 5.5,
    minScore: 0,
    maxScore: 8,
    submissionCount: 25,
    totalStudents: 30
  },
  {
    questionId: 1009,
    qnumber: "q_match_1",
    title: "Match sorting algorithms to complexities",
    questionType: "matching",
    maxPoints: 12,
    averageScore: 9.0,
    minScore: 0,
    maxScore: 12,
    submissionCount: 27,
    totalStudents: 30
  },
  {
    questionId: 1010,
    qnumber: "q_sel_1",
    title: "Random review question",
    questionType: "selectquestion",
    maxPoints: 10,
    averageScore: 6.8,
    minScore: 0,
    maxScore: 10,
    submissionCount: 29,
    totalStudents: 30
  },
  {
    questionId: 1011,
    qnumber: "q_iframe_1",
    title: "External SQL sandbox",
    questionType: "iframe",
    maxPoints: 15,
    averageScore: 10.5,
    minScore: 0,
    maxScore: 15,
    submissionCount: 22,
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
// Poll answers
// ---------------------------------------------------------------------------

export const mockedPollAnswers: StudentAnswer[] = [
  {
    id: 8001,
    sid: "alice",
    qnumber: "q_poll_1",
    answer: "2",
    correct: true,
    points: 1,
    maxPoints: 1,
    comment: "",
    timestamp: "2025-03-20T19:00:00",
    questionType: "poll"
  },
  {
    id: 8002,
    sid: "bob",
    qnumber: "q_poll_1",
    answer: "1",
    correct: true,
    points: 1,
    maxPoints: 1,
    comment: "",
    timestamp: "2025-03-20T19:01:00",
    questionType: "poll"
  },
  {
    id: 8003,
    sid: "charlie",
    qnumber: "q_poll_1",
    answer: "3",
    correct: true,
    points: 1,
    maxPoints: 1,
    comment: "",
    timestamp: "2025-03-20T19:02:00",
    questionType: "poll"
  },
  {
    id: 8004,
    sid: "diana",
    qnumber: "q_poll_1",
    answer: "2",
    correct: true,
    points: 1,
    maxPoints: 1,
    comment: "",
    timestamp: "2025-03-20T19:05:00",
    questionType: "poll"
  },
  {
    id: 8005,
    sid: "eve",
    qnumber: "q_poll_1",
    answer: "4",
    correct: true,
    points: 1,
    maxPoints: 1,
    comment: "",
    timestamp: "2025-03-20T19:03:00",
    questionType: "poll"
  }
];

export const mockedPollAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedPollAnswers
};

// ---------------------------------------------------------------------------
// Drag & Drop answers
// ---------------------------------------------------------------------------

export const mockedDnDAnswers: StudentAnswer[] = [
  {
    id: 9001,
    sid: "alice",
    qnumber: "q_dnd_1",
    answer: "Array:Sequential storage;LinkedList:Node-based storage;HashMap:Key-value pairs;Tree:Hierarchical structure",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T20:00:00",
    questionType: "dragndrop"
  },
  {
    id: 9002,
    sid: "bob",
    qnumber: "q_dnd_1",
    answer: "Array:Sequential storage;LinkedList:Key-value pairs;HashMap:Node-based storage;Tree:Hierarchical structure",
    correct: false,
    points: 5,
    maxPoints: 10,
    comment: "Swapped LinkedList and HashMap",
    timestamp: "2025-03-20T20:02:00",
    questionType: "dragndrop"
  },
  {
    id: 9003,
    sid: "charlie",
    qnumber: "q_dnd_1",
    answer: "Array:Sequential storage;LinkedList:Node-based storage;HashMap:Key-value pairs;Tree:Hierarchical structure",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T20:01:00",
    questionType: "dragndrop"
  },
  {
    id: 9004,
    sid: "diana",
    qnumber: "q_dnd_1",
    answer: "Array:Hierarchical structure;LinkedList:Sequential storage;HashMap:Node-based storage;Tree:Key-value pairs",
    correct: false,
    points: 0,
    maxPoints: 10,
    comment: "All pairs incorrect",
    timestamp: "2025-03-20T20:10:00",
    questionType: "dragndrop"
  }
];

export const mockedDnDAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedDnDAnswers
};

// ---------------------------------------------------------------------------
// Clickable Area answers
// ---------------------------------------------------------------------------

export const mockedClickableAreaAnswers: StudentAnswer[] = [
  {
    id: 10001,
    sid: "alice",
    qnumber: "q_ca_1",
    answer: "correct:1,3,5;incorrect:",
    correct: true,
    points: 8,
    maxPoints: 8,
    comment: "",
    timestamp: "2025-03-20T21:00:00",
    questionType: "clickablearea"
  },
  {
    id: 10002,
    sid: "bob",
    qnumber: "q_ca_1",
    answer: "correct:1,3;incorrect:2",
    correct: false,
    points: 4,
    maxPoints: 8,
    comment: "Missed line 5, false positive on line 2",
    timestamp: "2025-03-20T21:01:00",
    questionType: "clickablearea"
  },
  {
    id: 10003,
    sid: "charlie",
    qnumber: "q_ca_1",
    answer: "correct:1,3,5;incorrect:4",
    correct: false,
    points: 6,
    maxPoints: 8,
    comment: "All correct areas found, but also clicked line 4",
    timestamp: "2025-03-20T21:02:00",
    questionType: "clickablearea"
  },
  {
    id: 10004,
    sid: "diana",
    qnumber: "q_ca_1",
    answer: "correct:;incorrect:2,4,6",
    correct: false,
    points: 0,
    maxPoints: 8,
    comment: "No correct areas identified",
    timestamp: "2025-03-20T21:10:00",
    questionType: "clickablearea"
  },
  {
    id: 10005,
    sid: "eve",
    qnumber: "q_ca_1",
    answer: "correct:1,5;incorrect:",
    correct: false,
    points: 5,
    maxPoints: 8,
    comment: "Missed line 3",
    timestamp: "2025-03-20T21:05:00",
    questionType: "clickablearea"
  }
];

export const mockedClickableAreaAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedClickableAreaAnswers
};

// ---------------------------------------------------------------------------
// Matching answers
// ---------------------------------------------------------------------------

export const mockedMatchingAnswers: StudentAnswer[] = [
  {
    id: 11001,
    sid: "alice",
    qnumber: "q_match_1",
    answer: "BubbleSort:O(n²);MergeSort:O(n log n);QuickSort:O(n log n);InsertionSort:O(n²)",
    correct: true,
    points: 12,
    maxPoints: 12,
    comment: "",
    timestamp: "2025-03-20T22:00:00",
    questionType: "matching"
  },
  {
    id: 11002,
    sid: "bob",
    qnumber: "q_match_1",
    answer: "BubbleSort:O(n²);MergeSort:O(n²);QuickSort:O(n log n);InsertionSort:O(n log n)",
    correct: false,
    points: 6,
    maxPoints: 12,
    comment: "Swapped MergeSort and InsertionSort complexities",
    timestamp: "2025-03-20T22:02:00",
    questionType: "matching"
  },
  {
    id: 11003,
    sid: "charlie",
    qnumber: "q_match_1",
    answer: "BubbleSort:O(n²);MergeSort:O(n log n);QuickSort:O(n log n);InsertionSort:O(n²)",
    correct: true,
    points: 12,
    maxPoints: 12,
    comment: "",
    timestamp: "2025-03-20T22:01:00",
    questionType: "matching"
  },
  {
    id: 11004,
    sid: "diana",
    qnumber: "q_match_1",
    answer: "BubbleSort:O(n log n);MergeSort:O(n²);QuickSort:O(n²);InsertionSort:O(n log n)",
    correct: false,
    points: 0,
    maxPoints: 12,
    comment: "All pairs reversed",
    timestamp: "2025-03-20T22:15:00",
    questionType: "matching"
  },
  {
    id: 11005,
    sid: "eve",
    qnumber: "q_match_1",
    answer: "BubbleSort:O(n²);MergeSort:O(n log n);QuickSort:O(n²);InsertionSort:O(n²)",
    correct: false,
    points: 9,
    maxPoints: 12,
    comment: "QuickSort average case is O(n log n), not O(n²)",
    timestamp: "2025-03-20T22:03:00",
    questionType: "matching"
  }
];

export const mockedMatchingAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedMatchingAnswers
};

// ---------------------------------------------------------------------------
// Select Question answers
// ---------------------------------------------------------------------------

export const mockedSelectQuestionAnswers: StudentAnswer[] = [
  {
    id: 12001,
    sid: "alice",
    qnumber: "q_sel_1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T23:00:00",
    questionType: "selectquestion"
  },
  {
    id: 12002,
    sid: "bob",
    qnumber: "q_sel_1",
    answer: "C",
    correct: false,
    points: 0,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T23:02:00",
    questionType: "selectquestion"
  },
  {
    id: 12003,
    sid: "charlie",
    qnumber: "q_sel_1",
    answer: "B",
    correct: true,
    points: 10,
    maxPoints: 10,
    comment: "",
    timestamp: "2025-03-20T23:01:00",
    questionType: "selectquestion"
  },
  {
    id: 12004,
    sid: "diana",
    qnumber: "q_sel_1",
    answer: "A",
    correct: false,
    points: 3,
    maxPoints: 10,
    comment: "Partial credit – related concept",
    timestamp: "2025-03-20T23:10:00",
    questionType: "selectquestion"
  }
];

export const mockedSelectQuestionAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedSelectQuestionAnswers
};

// ---------------------------------------------------------------------------
// Iframe answers
// ---------------------------------------------------------------------------

export const mockedIframeAnswers: StudentAnswer[] = [
  {
    id: 13001,
    sid: "alice",
    qnumber: "q_iframe_1",
    answer: "SELECT * FROM users WHERE age > 21 ORDER BY name;",
    correct: true,
    points: 15,
    maxPoints: 15,
    comment: "",
    timestamp: "2025-03-21T10:00:00",
    questionType: "iframe"
  },
  {
    id: 13002,
    sid: "bob",
    qnumber: "q_iframe_1",
    answer: "SELECT * FROM users WHERE age > 21;",
    correct: false,
    points: 10,
    maxPoints: 15,
    comment: "Missing ORDER BY clause",
    timestamp: "2025-03-21T10:05:00",
    questionType: "iframe"
  },
  {
    id: 13003,
    sid: "charlie",
    qnumber: "q_iframe_1",
    answer: "SELECT name, age FROM users WHERE age > 21 ORDER BY name ASC;",
    correct: true,
    points: 15,
    maxPoints: 15,
    comment: "Extra specificity – good practice",
    timestamp: "2025-03-21T10:02:00",
    questionType: "iframe"
  },
  {
    id: 13004,
    sid: "diana",
    qnumber: "q_iframe_1",
    answer: "SELECT FROM users;",
    correct: false,
    points: 2,
    maxPoints: 15,
    comment: "Invalid SQL syntax, missing column list",
    timestamp: "2025-03-21T10:20:00",
    questionType: "iframe"
  },
  {
    id: 13005,
    sid: "eve",
    qnumber: "q_iframe_1",
    answer: "SELECT * FROM users WHERE age > 21 ORDER BY name DESC;",
    correct: false,
    points: 12,
    maxPoints: 15,
    comment: "DESC instead of ASC – minor issue",
    timestamp: "2025-03-21T10:08:00",
    questionType: "iframe"
  }
];

export const mockedIframeAnswersResponse: GetStudentAnswersResponse = {
  answers: mockedIframeAnswers
};

// ---------------------------------------------------------------------------
// Helper map: questionId → mocked answers response
// ---------------------------------------------------------------------------

export const mockedAnswersByQuestionId: Record<number, GetStudentAnswersResponse> = {
  1001: mockedMCAnswersResponse,
  1002: mockedFIBAnswersResponse,
  1003: mockedShortAnswersResponse,
  1004: mockedCodeAnswersResponse,
  1005: mockedParsonsAnswersResponse,
  1006: mockedPollAnswersResponse,
  1007: mockedDnDAnswersResponse,
  1008: mockedClickableAreaAnswersResponse,
  1009: mockedMatchingAnswersResponse,
  1010: mockedSelectQuestionAnswersResponse,
  1011: mockedIframeAnswersResponse
};

// ---------------------------------------------------------------------------
// Helper map: sid → mocked code history response
// ---------------------------------------------------------------------------

export const mockedCodeHistoryBySid: Record<string, GetCodeHistoryResponse> = {
  alice: mockedAliceCodeHistoryResponse,
  bob: mockedBobCodeHistoryResponse
};

