/**
 * StudentExercisePreview – renders a Runestone component preview
 * showing the student's submitted answer.
 *
 * Uses `renderRunestoneComponent` with `sid` and `graderactive` options
 * so the Runestone component loads and displays the student's response.
 */
import React, { useEffect, useReducer, useRef } from "react";

import { renderRunestoneComponent } from "@/componentFuncs";

interface StudentExercisePreviewProps {
  /** The HTML source of the question (from the server). */
  htmlsrc: string;
  /** The student's username / sid. */
  sid: string;
}

export const StudentExercisePreview: React.FC<StudentExercisePreviewProps> = ({
  htmlsrc,
  sid
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (ref.current && htmlsrc) {
      ref.current.innerHTML = htmlsrc;
      renderRunestoneComponent(ref, {
        sid,
        graderactive: true,
        useRunestoneServices: true
      }).then(forceUpdate);
    }
  }, [htmlsrc, sid]);

  return (
    <div className="ptx-runestone-container" style={{ width: "100%" }}>
      <div ref={ref} />
    </div>
  );
};

