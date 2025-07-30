import { DataFileListItem } from "@store/datafile/datafile.logic.api";

export const generateActiveCodePreview = (
  instructions: string,
  language: string,
  prefix_code: string,
  starter_code: string,
  suffix_code: string,
  name: string,
  datafile?: string,
  dataFileData?: DataFileListItem
): string => {
  // Sanitize ID by replacing spaces and special chars with underscores
  const safeId = name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const datafileAttr = datafile && dataFileData ? `data-datafile='${dataFileData.filename}'` : "";

  let dataFileHtml = "";

  if (datafile && dataFileData) {
    const isImage = ["jpg", "jpeg", "png"].includes(dataFileData.file_type.toLowerCase());

    if (isImage) {
      dataFileHtml = `
<div class="runestone datafile">
<img data-component="datafile" data-isimage="true" id="${dataFileData.filename}" data-filename="${dataFileData.filename}" src="data:image/${dataFileData.file_type};base64,${dataFileData.file_content}"/>
</div>`;
    } else {
      const rows = dataFileData.rows || 10;
      const cols = dataFileData.cols || 40;
      const isEditable = dataFileData.is_editable || false;

      if (isEditable) {
        dataFileHtml = `
<div class="runestone datafile">
<div class="datafile_caption"><code class="code-inline tex2jax_ignore">Data: ${dataFileData.filename}</code></div>
<textarea id="${dataFileData.filename}" rows="${rows}" cols="${cols}" class="datafiletextfield runestone-component-ready" data-filename="${dataFileData.filename}">${dataFileData.file_content}</textarea>
</div>`;
      } else {
        dataFileHtml = `
<div class="runestone datafile">
<div class="datafile_caption"><code class="code-inline tex2jax_ignore">Data: ${dataFileData.filename}</code></div>
<pre id="${dataFileData.filename}" data-component="datafile" data-filename="${dataFileData.filename}">${dataFileData.file_content}</pre>
</div>`;
      }
    }
  }

  return `
<div class="runestone explainer ac_section ">
<div data-component="activecode" id="${safeId}" data-question_label="${name}">
<div id="${safeId}_question" class="ac_question">
<p>${instructions}</p>

</div>
<textarea 
    data-lang="${language}" id="${safeId}_editor" 
    data-timelimit=25000  data-codelens="true"   
    data-audio=''      
    data-wasm=/_static
    ${datafileAttr}
     style="visibility: hidden;">
${prefix_code}
^^^^
${starter_code}
====
${suffix_code}
</textarea> 
</div>
</div>
${dataFileHtml}
  `;
};
