import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@store/baseQuery";
import toast from "react-hot-toast";

import { DetailResponse } from "@/types/api";

export interface DataFileRequest {
  name: string; // acid for the datafile
  filename: string;
  file_content: string;
  file_type: string;
  is_editable: boolean;
  rows: number;
  cols: number;
}

export interface DataFileResponse {
  status: string;
  id: number;
  acid: string;
  filename: string;
}

export interface DataFileListItem {
  id: number;
  name: string; // acid
  filename: string;
  file_type: string;
  file_content: string;
  is_editable: boolean;
  rows: number;
  cols: number;
}

export const dataFileApi = createApi({
  reducerPath: "dataFileAPI",
  keepUnusedDataFor: 60,
  baseQuery: baseQuery,
  tagTypes: ["DataFile"],
  endpoints: (build) => ({
    createDataFile: build.mutation<DataFileResponse, DataFileRequest>({
      query: (body) => ({
        method: "POST",
        url: "/assignment/instructor/datafile",
        body
      }),
      transformResponse: (response: DetailResponse<DataFileResponse>) => {
        return response.detail;
      },
      onQueryStarted: (_, { queryFulfilled }) => {
        queryFulfilled
          .then((result) => {
            toast.success(`DataFile "${result.data.filename}" created successfully!`);
          })
          .catch(() => {
            toast.error("Error creating DataFile", { duration: Infinity });
          });
      },
      invalidatesTags: ["DataFile"]
    }),
    getDataFiles: build.query<DataFileListItem[], void>({
      query: () => ({
        method: "GET",
        url: "/assignment/instructor/datafiles"
      }),
      transformResponse: (response: DetailResponse<DataFileListItem[]>) => {
        return response.detail;
      },
      providesTags: ["DataFile"]
    })
  })
});

export const { useCreateDataFileMutation, useGetDataFilesQuery } = dataFileApi;
