/**
 * Redux slice for GraderV2 local UI state.
 */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { GraderState, GraderViewMode } from "@/types/grader";
import { Nullable } from "@/types/common";

const INITIAL_STATE: GraderState = {
  selectedAssignmentId: null,
  selectedQuestionId: null,
  viewMode: "summary"
};

export const graderSlice = createSlice({
  name: "grader",
  initialState: INITIAL_STATE,
  reducers: {
    setSelectedAssignmentId(state, action: PayloadAction<Nullable<number>>) {
      state.selectedAssignmentId = action.payload;
      // reset question selection when assignment changes
      state.selectedQuestionId = null;
      state.viewMode = "summary";
    },
    setSelectedQuestionId(state, action: PayloadAction<Nullable<number>>) {
      state.selectedQuestionId = action.payload;
      state.viewMode = action.payload !== null ? "question" : "summary";
    },
    setViewMode(state, action: PayloadAction<GraderViewMode>) {
      state.viewMode = action.payload;
    },
    resetGraderState() {
      return INITIAL_STATE;
    }
  }
});

export const graderActions = graderSlice.actions;

/**
 * Selectors use a state shape that includes the `grader` key.
 * We avoid importing `RootState` from rootReducer directly to
 * prevent circular dependencies (rootReducer imports graderSlice).
 */
type StateWithGrader = { grader: GraderState };

export const graderSelectors = {
  getSelectedAssignmentId: (state: StateWithGrader): Nullable<number> =>
    state.grader.selectedAssignmentId,
  getSelectedQuestionId: (state: StateWithGrader): Nullable<number> =>
    state.grader.selectedQuestionId,
  getViewMode: (state: StateWithGrader): GraderViewMode => state.grader.viewMode
};


