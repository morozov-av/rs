/**
 * RTK Query API for the GraderV2 interface.
 *
 * Provides endpoints to:
 * - Fetch per-question summaries for an assignment
 * - Fetch student answers for a specific question
 * - Fetch code history for a specific student + coding question
 * - Update a student's grade (partial credit)
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@store/baseQuery";

import { DetailResponse } from "@/types/api";
import {
  GetCodeHistoryRequest,
  GetCodeHistoryResponse,
  GetQuestionSummariesRequest,
  GetQuestionSummariesResponse,
  GetStudentAnswersRequest,
  GetStudentAnswersResponse,
  UpdateGradeRequest,
  UpdateGradeResponse
} from "@/types/grader";

export const graderApi = createApi({
  reducerPath: "graderAPI",
  keepUnusedDataFor: 60,
  baseQuery: baseQuery,
  tagTypes: ["GraderSummaries", "StudentAnswers", "CodeHistory"],
  endpoints: (build) => ({
    /** Fetch question-level summaries for a given assignment. */
    getQuestionSummaries: build.query<
      GetQuestionSummariesResponse,
      GetQuestionSummariesRequest
    >({
      query: ({ assignmentId }) => ({
        method: "GET",
        url: `/assignment/instructor/grader/${assignmentId}/summaries`
      }),
      providesTags: ["GraderSummaries"],
      transformResponse: (response: DetailResponse<GetQuestionSummariesResponse>) =>
        response.detail
    }),

    /** Fetch all student answers for a given question inside an assignment. */
    getStudentAnswers: build.query<
      GetStudentAnswersResponse,
      GetStudentAnswersRequest
    >({
      query: ({ assignmentId, questionId }) => ({
        method: "GET",
        url: `/assignment/instructor/grader/${assignmentId}/question/${questionId}/answers`
      }),
      providesTags: ["StudentAnswers"],
      transformResponse: (response: DetailResponse<GetStudentAnswersResponse>) =>
        response.detail
    }),

    /** Fetch the code history for a student on a coding question. */
    getCodeHistory: build.query<GetCodeHistoryResponse, GetCodeHistoryRequest>({
      query: ({ questionId, sid }) => ({
        method: "GET",
        url: `/assignment/instructor/grader/question/${questionId}/student/${sid}/history`
      }),
      providesTags: ["CodeHistory"],
      transformResponse: (response: DetailResponse<GetCodeHistoryResponse>) =>
        response.detail
    }),

    /** Update (partial-credit) grade for a specific student answer. */
    updateGrade: build.mutation<UpdateGradeResponse, UpdateGradeRequest>({
      query: (body) => ({
        method: "PUT",
        url: `/assignment/instructor/grader/grade`,
        body
      }),
      invalidatesTags: ["StudentAnswers", "GraderSummaries"],
      transformResponse: (response: DetailResponse<UpdateGradeResponse>) =>
        response.detail
    })
  })
});

export const {
  useGetQuestionSummariesQuery,
  useGetStudentAnswersQuery,
  useGetCodeHistoryQuery,
  useUpdateGradeMutation
} = graderApi;

