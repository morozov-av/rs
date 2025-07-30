import { MathJaxWrapper } from "@components/routes/AssignmentBuilder/MathJaxWrapper";
import { MathJax } from "better-react-mathjax";
import { useEffect, useReducer, useRef } from "react";

import { renderRunestoneComponent } from "@/componentFuncs";
import { Exercise } from "@/types/exercises";

export const ExercisePreview = ({
  htmlsrc
}: Pick<Exercise, "htmlsrc"> & { maxHeight?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (ref.current) {
      console.log("ref here");
      ref.current.innerHTML = htmlsrc;
      renderRunestoneComponent(ref, {}).then(forceUpdate);
    }
  }, [htmlsrc]);

  return (
    <MathJaxWrapper>
      <MathJax>
        <style>
          {`
            .ptx-runestone-container .CodeMirror-scroll {
              max-height: none !important;
            }
            .ptx-runestone-container .CodeMirror {
              height: auto !important;
            }
            .exercise-preview-content img {
              max-width: 100% !important;
              height: auto !important;
            }
            .exercise-preview-content pre {
              white-space: pre-wrap !important;
              word-wrap: break-word !important;
              overflow-x: auto !important;
              max-width: 100% !important;
            }
          `}
        </style>
        <div className="ptx-runestone-container exercise-preview-container relative flex justify-content-center w-full">
          <div className="flex justify-content-center w-full">
            <div ref={ref} className="exercise-preview-content text-left mx-auto w-full"></div>
          </div>
        </div>
      </MathJax>
    </MathJaxWrapper>
  );
};
