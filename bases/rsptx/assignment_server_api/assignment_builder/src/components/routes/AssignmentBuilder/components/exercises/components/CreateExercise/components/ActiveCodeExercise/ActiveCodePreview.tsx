import { ExercisePreview } from "@components/routes/AssignmentBuilder/components/exercises/components/ExercisePreview/ExercisePreview";
import { useGetDataFilesQuery, DataFileListItem } from "@store/datafile/datafile.logic.api";
import { FC } from "react";

import { generateActiveCodePreview } from "@/utils/preview/activeCode";

interface ActiveCodePreviewProps {
  instructions: string;
  language: string;
  prefix_code: string;
  starter_code: string;
  suffix_code: string;
  name: string;
  datafile?: string;
}

export const ActiveCodePreview: FC<ActiveCodePreviewProps> = ({
  instructions,
  language,
  prefix_code,
  starter_code,
  suffix_code,
  name,
  datafile
}) => {
  const compatibleLanguages = ["python", "java"];
  const isLanguageCompatible = compatibleLanguages.includes(language.toLowerCase());

  const { data: dataFiles = [] } = useGetDataFilesQuery(undefined, {
    skip: !isLanguageCompatible || !datafile
  });

  const dataFileData = dataFiles.find((df: DataFileListItem) => df.name === datafile);

  return (
    <div style={{ display: "flex", alignItems: "start", justifyContent: "center" }}>
      <ExercisePreview
        htmlsrc={generateActiveCodePreview(
          instructions,
          language,
          prefix_code,
          starter_code,
          suffix_code,
          name,
          datafile,
          dataFileData
        )}
      />
    </div>
  );
};
