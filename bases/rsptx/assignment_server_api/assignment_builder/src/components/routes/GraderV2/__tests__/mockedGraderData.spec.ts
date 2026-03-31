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
  mockedAliceCodeHistory,
  mockedBobCodeHistory,
  mockedAnswersByQuestionId,
  mockedCodeHistoryBySid
} from "@/spec/mock/mockedGraderData";

describe("mockedGraderData", () => {
  describe("Question summaries", () => {
    it("has 5 question summaries covering all question types", () => {
      expect(mockedQuestionSummaries).toHaveLength(5);

      const types = mockedQuestionSummaries.map((s) => s.questionType);

      expect(types).toContain("mchoice");
      expect(types).toContain("fillintheblank");
      expect(types).toContain("shortanswer");
      expect(types).toContain("activecode");
      expect(types).toContain("parsonsprob");
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

  describe("Lookup maps", () => {
    it("mockedAnswersByQuestionId contains all 5 question ids", () => {
      expect(Object.keys(mockedAnswersByQuestionId)).toHaveLength(5);
    });

    it("mockedCodeHistoryBySid contains alice and bob", () => {
      expect(mockedCodeHistoryBySid).toHaveProperty("alice");
      expect(mockedCodeHistoryBySid).toHaveProperty("bob");
    });
  });
});

