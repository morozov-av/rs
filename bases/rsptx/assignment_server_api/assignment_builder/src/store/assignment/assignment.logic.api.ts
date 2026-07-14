import { notify } from "@components/ui/notify";
import { createApi } from "@reduxjs/toolkit/query/react";
import { assignmentActions } from "@store/assignment/assignment.logic";
import { userActions } from "@store/user/userLogic";

import { baseQuery } from "@/store/baseQuery";
import { DetailResponse, HttpStatusCode } from "@/types/api";
import {
  Assignment,
  CreateAssignmentPayload,
  CreateAssignmentValidationResponse,
  GetAssignmentResponse,
  GetAssignmentsResponse
} from "@/types/assignment";

export const ASSIGNMENT_TOAST_COPY = {
  loadAssignmentsError: "Couldn't load assignments. Refresh the page.",
  loadAssignmentError: "Couldn't load the assignment. Refresh the page.",
  created: "Assignment created",
  createValidationError: (message: string) => `Couldn't create assignment: ${message}`,
  createError: "Couldn't create assignment. Try again.",
  updateError: "Couldn't update assignment. Try again.",
  deleted: "Assignment deleted",
  deleteError: "Couldn't delete assignment. Try again.",
  duplicated: (name: string) => `Assignment duplicated as "${name}"`,
  duplicateError: "Couldn't duplicate assignment. Try again.",
  bulkDeleted: (count: number) => `Deleted ${count} ${count === 1 ? "assignment" : "assignments"}`,
  bulkDeleteError: (count: number) =>
    `Couldn't delete ${count} ${count === 1 ? "assignment" : "assignments"}. Try again.`
} as const;

export interface BulkActionResult {
  succeeded: number;
  failed: number;
}

export const assignmentApi = createApi({
  reducerPath: "assignmentAPI",
  keepUnusedDataFor: 60, //change to 0 for tests,
  baseQuery: baseQuery,
  tagTypes: ["Assignments", "Exercises", "Assignment"],
  endpoints: (build) => ({
    getAssignments: build.query<Assignment[], void>({
      query: () => ({
        method: "GET",
        url: "/assignment/instructor/assignments"
      }),
      providesTags: ["Assignments"],
      transformResponse: (response: DetailResponse<GetAssignmentsResponse>) => {
        return response.detail.assignments;
      },
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((errorResponse) => {
          const { status } = errorResponse.error as {
            status: number;
          };

          if (status === HttpStatusCode.UNAUTHORIZED) {
            notify.error({
              id: "api-unauthorized",
              message: "Your session expired. Sign in again.",
              autoClose: 6000
            });
            dispatch(userActions.setIsAuthorized(false));
            return;
          }

          notify.error(ASSIGNMENT_TOAST_COPY.loadAssignmentsError);
        });
      }
    }),
    getAssignment: build.query<Assignment, number>({
      query: (id: number) => ({
        method: "GET",
        url: `/assignment/instructor/assignments/${id}`
      }),
      keepUnusedDataFor: 0.1,
      providesTags: ["Assignment"],
      transformResponse: (response: DetailResponse<GetAssignmentResponse>) => {
        return response.detail.assignment;
      },
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((errorResponse) => {
          const { status } = errorResponse.error as {
            status: number;
          };

          if (status === HttpStatusCode.UNAUTHORIZED) {
            notify.error({
              id: "api-unauthorized",
              message: "Your session expired. Sign in again.",
              autoClose: 6000
            });
            dispatch(userActions.setIsAuthorized(false));
            return;
          }

          notify.error(ASSIGNMENT_TOAST_COPY.loadAssignmentError);
        });
      }
    }),
    createAssignment: build.mutation<DetailResponse<{ id: number }>, CreateAssignmentPayload>({
      query: (body) => ({
        method: "POST",
        url: "/assignment/instructor/assignments",
        body
      }),
      invalidatesTags: (_, error) => {
        if (!error) {
          return [{ type: "Assignments" }];
        }
        return [];
      },
      onQueryStarted: (_, { queryFulfilled, dispatch }) => {
        queryFulfilled
          .then(({ data }) => {
            dispatch(assignmentActions.setSelectedAssignmentId(data.detail.id));
            notify.success(ASSIGNMENT_TOAST_COPY.created);
          })
          .catch((errorResponse) => {
            const { status, data } = errorResponse.error as {
              status: number;
              data: DetailResponse<CreateAssignmentValidationResponse>;
            };

            if (status === HttpStatusCode.UNPROCESSABLE_CONTENT) {
              notify.error(ASSIGNMENT_TOAST_COPY.createValidationError(data.detail[0].msg));
              return;
            }

            notify.error(ASSIGNMENT_TOAST_COPY.createError);
          });
      }
    }),
    updateAssignment: build.mutation<void, Assignment>({
      query: (body) => ({
        method: "PUT",
        url: `/assignment/instructor/assignments/${body.id}`,
        body
      }),
      invalidatesTags: (_, error) => {
        if (!error) {
          return [{ type: "Assignments" }, { type: "Assignment" }];
        }
        return [];
      },
      onQueryStarted: (_, { queryFulfilled }) => {
        queryFulfilled.catch(() => {
          notify.error(ASSIGNMENT_TOAST_COPY.updateError);
        });
      }
    }),
    removeAssignment: build.mutation<void, Assignment>({
      query: (body) => ({
        method: "DELETE",
        url: `/assignment/instructor/assignments/${body.id}`
      }),
      invalidatesTags: (_, error) => {
        if (!error) {
          return [{ type: "Assignments" }];
        }
        return [];
      },
      onQueryStarted: (_, { queryFulfilled }) => {
        queryFulfilled
          .then(() => {
            notify.success(ASSIGNMENT_TOAST_COPY.deleted);
          })
          .catch(() => {
            notify.error(ASSIGNMENT_TOAST_COPY.deleteError);
          });
      }
    }),
    bulkUpdateAssignments: build.mutation<BulkActionResult, Assignment[]>({
      queryFn: async (assignments, _api, _extraOptions, fetchWithBQ) => {
        const results = await Promise.all(
          assignments.map((assignment) =>
            fetchWithBQ({
              method: "PUT",
              url: `/assignment/instructor/assignments/${assignment.id}`,
              body: assignment
            })
          )
        );
        const failed = results.filter((result) => result.error).length;

        return { data: { succeeded: assignments.length - failed, failed } };
      },
      invalidatesTags: (result) => {
        if (result && result.succeeded > 0) {
          return [{ type: "Assignments" }, { type: "Assignment" }];
        }
        return [];
      }
    }),
    bulkRemoveAssignments: build.mutation<BulkActionResult, Assignment[]>({
      queryFn: async (assignments, _api, _extraOptions, fetchWithBQ) => {
        const results = await Promise.all(
          assignments.map((assignment) =>
            fetchWithBQ({
              method: "DELETE",
              url: `/assignment/instructor/assignments/${assignment.id}`
            })
          )
        );
        const failed = results.filter((result) => result.error).length;

        return { data: { succeeded: assignments.length - failed, failed } };
      },
      invalidatesTags: (result) => {
        if (result && result.succeeded > 0) {
          return [{ type: "Assignments" }];
        }
        return [];
      },
      onQueryStarted: (_, { queryFulfilled }) => {
        queryFulfilled
          .then(({ data }) => {
            if (data.succeeded > 0) {
              notify.success(ASSIGNMENT_TOAST_COPY.bulkDeleted(data.succeeded));
            }
            if (data.failed > 0) {
              notify.error(ASSIGNMENT_TOAST_COPY.bulkDeleteError(data.failed));
            }
          })
          .catch(() => {
            notify.error(ASSIGNMENT_TOAST_COPY.deleteError);
          });
      }
    }),
    duplicateAssignment: build.mutation<DetailResponse<{ id: number; name: string }>, number>({
      query: (assignmentId) => ({
        method: "POST",
        url: `/assignment/instructor/assignments/${assignmentId}/duplicate`
      }),
      invalidatesTags: (_, error) => {
        if (!error) {
          return [{ type: "Assignments" }];
        }
        return [];
      },
      onQueryStarted: (_, { queryFulfilled }) => {
        queryFulfilled
          .then(({ data }) => {
            notify.success(ASSIGNMENT_TOAST_COPY.duplicated(data.detail.name));
          })
          .catch(() => {
            notify.error(ASSIGNMENT_TOAST_COPY.duplicateError);
          });
      }
    })
  })
});

export const {
  useGetAssignmentsQuery,
  useGetAssignmentQuery,
  useUpdateAssignmentMutation,
  useCreateAssignmentMutation,
  useRemoveAssignmentMutation,
  useDuplicateAssignmentMutation,
  useBulkUpdateAssignmentsMutation,
  useBulkRemoveAssignmentsMutation
} = assignmentApi;
