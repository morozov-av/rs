export const generateDataFilePreview = (
    filename: string,
    fileContent: string,
    fileType: string,
    isEditable: boolean,
    rows: number,
    cols: number,
    questionName: string
): string => {
    const isImage = ["jpg", "jpeg", "png"].includes(fileType.toLowerCase());

    if (isImage) {
        return `<div class="runestone datafile">
<div class="datafile_caption"><code class="code-inline tex2jax_ignore">Data: ${filename}</code></div>
<img data-component="datafile" data-isimage="true" id="${questionName}" data-filename="${filename}" src="data:image/${fileType};base64,${fileContent}"/>
</div>`;
    }

    if (isEditable) {
        return `<div class="runestone datafile">
<div class="datafile_caption"><code class="code-inline tex2jax_ignore">Data: ${filename}</code></div>
<textarea id="${questionName}" rows="${rows}" cols="${cols}" class="datafiletextfield runestone-component-ready" data-filename="${filename}">${fileContent}</textarea>
</div>`;
    }

    return `<div class="runestone datafile">
<div class="datafile_caption"><code class="code-inline tex2jax_ignore">Data: ${filename}</code></div>
<pre id="${questionName}" data-component="datafile" data-filename="${filename}">${fileContent}</pre>
</div>`;
}; 