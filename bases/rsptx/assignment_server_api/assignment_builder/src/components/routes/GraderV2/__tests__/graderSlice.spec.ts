/**
 * Unit tests for the grader Redux slice.
 */
import { graderActions, graderSlice } from "@store/grader/grader.logic";

import { GraderState } from "@/types/grader";

const reducer = graderSlice.reducer;

const INITIAL: GraderState = {
  selectedAssignmentId: null,
  selectedQuestionId: null,
  viewMode: "summary"
};

describe("graderSlice", () => {
  it("has the correct initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual(INITIAL);
  });

  describe("setSelectedAssignmentId", () => {
    it("sets the assignment id and resets question state", () => {
      const prev: GraderState = {
        selectedAssignmentId: 1,
        selectedQuestionId: 42,
        viewMode: "question"
      };

      const state = reducer(prev, graderActions.setSelectedAssignmentId(99));

      expect(state.selectedAssignmentId).toBe(99);
      expect(state.selectedQuestionId).toBeNull();
      expect(state.viewMode).toBe("summary");
    });

    it("clears the assignment id when null is dispatched", () => {
      const prev: GraderState = {
        selectedAssignmentId: 5,
        selectedQuestionId: null,
        viewMode: "summary"
      };

      const state = reducer(prev, graderActions.setSelectedAssignmentId(null));

      expect(state.selectedAssignmentId).toBeNull();
    });
  });

  describe("setSelectedQuestionId", () => {
    it("sets the question id and switches to question view", () => {
      const state = reducer(INITIAL, graderActions.setSelectedQuestionId(42));

      expect(state.selectedQuestionId).toBe(42);
      expect(state.viewMode).toBe("question");
    });

    it("clears the question id and switches back to summary view", () => {
      const prev: GraderState = {
        selectedAssignmentId: 1,
        selectedQuestionId: 42,
        viewMode: "question"
      };

      const state = reducer(prev, graderActions.setSelectedQuestionId(null));

      expect(state.selectedQuestionId).toBeNull();
      expect(state.viewMode).toBe("summary");
    });
  });

  describe("setViewMode", () => {
    it("updates the view mode", () => {
      const state = reducer(INITIAL, graderActions.setViewMode("question"));

      expect(state.viewMode).toBe("question");
    });
  });

  describe("resetGraderState", () => {
    it("resets to initial state", () => {
      const prev: GraderState = {
        selectedAssignmentId: 10,
        selectedQuestionId: 20,
        viewMode: "question"
      };

      const state = reducer(prev, graderActions.resetGraderState());

      expect(state).toEqual(INITIAL);
    });
  });
});

