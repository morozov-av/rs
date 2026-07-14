import React from "react";

import styles from "./AnswerViews.module.css";
import { AnswerRendererProps } from "./types";

export const IframeAnswerView: React.FC<AnswerRendererProps> = ({
  htmlsrc,
  answer,
  questionName
}) => {
  return (
    <div>
      <section className={styles.interactiveSection}>
        <h4 className={styles.rendererTitle}>
          Question: <span className={styles.questionName}>{questionName}</span>
        </h4>
        {htmlsrc ? (
          <div className={styles.iframePreview} dangerouslySetInnerHTML={{ __html: htmlsrc }} />
        ) : (
          <p className={styles.mutedNote}>(question preview not available)</p>
        )}
      </section>
      <h4 className={styles.rendererTitle}>Student answer</h4>
      <pre className={styles.codeBlock}>{answer || "(empty)"}</pre>
    </div>
  );
};
