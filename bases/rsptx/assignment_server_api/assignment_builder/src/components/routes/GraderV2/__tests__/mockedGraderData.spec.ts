/**
 * Tests for the mocked grader data to verify its structural correctness.
 */
import {
  mockedQuestionSummaries,
  mockedMCAnswers,
  mockedFIBAnswers,
  mockedShortAnswers,
  mockedCodeAnswers,
  mockedParsonsAnswers,
  mockedPollAnswers,
  mockedDnDAnswers,
  mockedClickableAreaAnswers,
  mockedMatchingAnswers,
  mockedSelectQuestionAnswers,
  mockedIframeAnswers,
  mockedAliceCodeHistory,
  mockedBobCodeHistory,
  mockedAnswersByQuestionId,
  mockedCodeHistoryBySid
} from "@/spec/mock/mockedGraderData";

describe("mockedGraderData", () => {
  describe("Question summaries", () => {
    it("has 11 question summaries covering all question types", () => {
      expect(mockedQuestionSummaries).toHaveLength(11);

      const types = mockedQuestionSummaries.map((s) => s.questionType);

      expect(types).toContain("mchoice");
      expect(types).toContain("fillintheblank");
      expect(types).toContain("shortanswer");
      expect(types).toContain("activecode");
      expect(types).toContain("parsonsprob");
      expect(types).toContain("poll");
      expect(types).toContain("dragndrop");
      expect(types).toContain("clickablearea");
      expect(types).toContain("matching");
      expect(types).toContain("selectquestion");
      expect(types).toContain("iframe");
    });

    it("has unique question ids", () => {
      const ids = mockedQuestionSummaries.map((s) => s.questionId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has valid numeric fields", () => {
      mockedQuestionSummaries.forEach((s) => {
        expect(s.maxPoints).toBeGreaterThan(0);
        expect(s.averageScore).toBeGreaterThanOrEqual(s.minScore);
        expect(s.averageScore).toBeLessThanOrEqual(s.maxPoints);
        expect(s.submissionCount).toBeLessThanOrEqual(s.totalStudents);
      });
    });
  });

  describe("Multiple-choice answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedMCAnswers).toHaveLength(5);
    });

    it("all answers reference the same qnumber", () => {
      mockedMCAnswers.forEach((a) => expect(a.qnumber).toBe("q_mc_1"));
    });

    it("correct answers have full points", () => {
      mockedMCAnswers
        .filter((a) => a.correct)
        .forEach((a) => expect(a.points).toBe(a.maxPoints));
    });
  });

  describe("Fill-in-the-blank answers", () => {
    it("contains 4 student answers", () => {
      expect(mockedFIBAnswers).toHaveLength(4);
    });

    it("allows partial credit", () => {
      const diana = mockedFIBAnswers.find((a) => a.sid === "diana");

      expect(diana).toBeDefined();
      expect(diana!.correct).toBe(false);
      expect(diana!.points).toBeGreaterThan(0);
      expect(diana!.points).toBeLessThan(diana!.maxPoints);
    });
  });

  describe("Short-answer answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedShortAnswers).toHaveLength(5);
    });

    it("has grader comments for manually graded answers", () => {
      const commented = mockedShortAnswers.filter((a) => a.comment.length > 0);

      expect(commented.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Active-code answers", () => {
    it("contains 4 student answers", () => {
      expect(mockedCodeAnswers).toHaveLength(4);
    });

    it("answer text looks like Python code", () => {
      mockedCodeAnswers.forEach((a) => {
        expect(a.answer).toContain("def fibonacci");
      });
    });
  });

  describe("Code history", () => {
    it("alice has 3 history snapshots", () => {
      expect(mockedAliceCodeHistory).toHaveLength(3);
    });

    it("bob has 2 history snapshots", () => {
      expect(mockedBobCodeHistory).toHaveLength(2);
    });

    it("timestamps are in chronological order", () => {
      for (let i = 1; i < mockedAliceCodeHistory.length; i++) {
        expect(mockedAliceCodeHistory[i].timestamp > mockedAliceCodeHistory[i - 1].timestamp).toBe(
          true
        );
      }
    });
  });

  describe("Parsons answers", () => {
    it("contains 4 student answers", () => {
      expect(mockedParsonsAnswers).toHaveLength(4);
    });

    it("correct answers parse into block arrays", () => {
      const correct = mockedParsonsAnswers.filter((a) => a.correct);

      correct.forEach((a) => {
        const parsed = JSON.parse(a.answer);

        expect(Array.isArray(parsed)).toBe(true);
        parsed.forEach((block: { content: string; indent: number }) => {
          expect(typeof block.content).toBe("string");
          expect(typeof block.indent).toBe("number");
        });
      });
    });

    it("has a non-JSON fallback answer (diana)", () => {
      const diana = mockedParsonsAnswers.find((a) => a.sid === "diana");

      expect(diana).toBeDefined();
      expect(() => JSON.parse(diana!.answer)).toThrow();
    });
  });

  describe("Poll answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedPollAnswers).toHaveLength(5);
    });

    it("all answers reference q_poll_1", () => {
      mockedPollAnswers.forEach((a) => expect(a.qnumber).toBe("q_poll_1"));
    });

    it("all poll answers are marked correct (participation credit)", () => {
      mockedPollAnswers.forEach((a) => {
        expect(a.correct).toBe(true);
        expect(a.points).toBe(1);
      });
    });

    it("answers are numeric option indices", () => {
      mockedPollAnswers.forEach((a) => {
        expect(Number.isNaN(Number(a.answer))).toBe(false);
      });
    });
  });

  describe("Drag & Drop answers", () => {
    it("contains 4 student answers", () => {
      expect(mockedDnDAnswers).toHaveLength(4);
    });

    it("all answers reference q_dnd_1", () => {
      mockedDnDAnswers.forEach((a) => expect(a.qnumber).toBe("q_dnd_1"));
    });

    it("answer format contains key:value pairs separated by semicolons", () => {
      mockedDnDAnswers.forEach((a) => {
        expect(a.answer).toContain(":");
        expect(a.answer).toContain(";");
      });
    });

    it("has mix of correct and incorrect", () => {
      const correct = mockedDnDAnswers.filter((a) => a.correct);
      const incorrect = mockedDnDAnswers.filter((a) => !a.correct);
      expect(correct.length).toBeGreaterThan(0);
      expect(incorrect.length).toBeGreaterThan(0);
    });
  });

  describe("Clickable Area answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedClickableAreaAnswers).toHaveLength(5);
    });

    it("all answers reference q_ca_1", () => {
      mockedClickableAreaAnswers.forEach((a) => expect(a.qnumber).toBe("q_ca_1"));
    });

    it("answer format contains correct: and incorrect: sections", () => {
      mockedClickableAreaAnswers.forEach((a) => {
        expect(a.answer).toContain("correct:");
        expect(a.answer).toContain("incorrect:");
      });
    });

    it("includes partial credit scenarios", () => {
      const partial = mockedClickableAreaAnswers.filter(
        (a) => !a.correct && a.points > 0 && a.points < a.maxPoints
      );
      expect(partial.length).toBeGreaterThan(0);
    });
  });

  describe("Matching answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedMatchingAnswers).toHaveLength(5);
    });

    it("all answers reference q_match_1", () => {
      mockedMatchingAnswers.forEach((a) => expect(a.qnumber).toBe("q_match_1"));
    });

    it("answer format contains key:value pairs separated by semicolons", () => {
      mockedMatchingAnswers.forEach((a) => {
        expect(a.answer).toContain(":");
        expect(a.answer).toContain(";");
      });
    });

    it("has zero-point, partial-credit, and full-credit answers", () => {
      const points = mockedMatchingAnswers.map((a) => a.points);
      expect(points).toContain(0);
      expect(points).toContain(12); // full
      expect(points.some((p) => p > 0 && p < 12)).toBe(true); // partial
    });
  });

  describe("Select Question answers", () => {
    it("contains 4 student answers", () => {
      expect(mockedSelectQuestionAnswers).toHaveLength(4);
    });

    it("all answers reference q_sel_1", () => {
      mockedSelectQuestionAnswers.forEach((a) => expect(a.qnumber).toBe("q_sel_1"));
    });

    it("includes partial credit (diana)", () => {
      const diana = mockedSelectQuestionAnswers.find((a) => a.sid === "diana");
      expect(diana).toBeDefined();
      expect(diana!.correct).toBe(false);
      expect(diana!.points).toBeGreaterThan(0);
      expect(diana!.points).toBeLessThan(diana!.maxPoints);
    });
  });

  describe("Iframe answers", () => {
    it("contains 5 student answers", () => {
      expect(mockedIframeAnswers).toHaveLength(5);
    });

    it("all answers reference q_iframe_1", () => {
      mockedIframeAnswers.forEach((a) => expect(a.qnumber).toBe("q_iframe_1"));
    });

    it("answers contain SQL-like content", () => {
      mockedIframeAnswers.forEach((a) => {
        expect(a.answer.toUpperCase()).toContain("SELECT");
      });
    });

    it("has grader comments on incorrect answers", () => {
      const incorrectWithComments = mockedIframeAnswers.filter(
        (a) => !a.correct && a.comment.length > 0
      );
      expect(incorrectWithComments.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Lookup maps", () => {
    it("mockedAnswersByQuestionId contains all 11 question ids", () => {
      expect(Object.keys(mockedAnswersByQuestionId)).toHaveLength(11);
    });

    it("mockedCodeHistoryBySid contains alice and bob", () => {
      expect(mockedCodeHistoryBySid).toHaveProperty("alice");
      expect(mockedCodeHistoryBySid).toHaveProperty("bob");
    });
  });
});

