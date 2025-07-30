import {
  useGetDataFilesQuery,
  useCreateDataFileMutation,
  DataFileListItem
} from "@store/datafile/datafile.logic.api";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { RadioButton } from "primereact/radiobutton";
import { Toast } from "primereact/toast";
import { FC, useEffect, useRef, useState } from "react";

const COMPATIBLE_LANGUAGES = ["python", "java"];
const IMAGE_TYPES = ["png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 15_000_000;
const DEFAULT_FORM_DATA = {
  name: "",
  filename: "",
  file_content: "",
  file_type: "txt",
  source_type: "textarea" as const,
  is_editable: false,
  rows: 10,
  cols: 50
};

interface DataFileSelectorProps {
  selectedDataFile?: string;
  onChange: (dataFileId: string | null) => void;
  language: string;
}

interface DataFileOption {
  label: string;
  value: string;
  description?: string;
}

interface CreateDataFileForm {
  name: string;
  filename: string;
  file_content: string;
  file_type: string;
  source_type: "file" | "textarea";
  is_editable: boolean;
  rows: number;
  cols: number;
}

export const DataFileSelector: FC<DataFileSelectorProps> = ({
  selectedDataFile,
  onChange,
  language
}) => {
  const toast = useRef<Toast>(null);
  const isLanguageCompatible = language && COMPATIBLE_LANGUAGES.includes(language.toLowerCase());

  const {
    data: dataFiles = [],
    isLoading,
    refetch
  } = useGetDataFilesQuery(undefined, {
    skip: !isLanguageCompatible
  });
  const [createDataFile, { isLoading: isCreating }] = useCreateDataFileMutation();

  const [options, setOptions] = useState<DataFileOption[]>([
    { label: "No DataFile", value: "", description: "Don't use any data file" }
  ]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateDataFileForm>(DEFAULT_FORM_DATA);
  const [textareaContent, setTextareaContent] = useState("");

  useEffect(() => {
    if (!isLanguageCompatible) {
      setOptions([{ label: "No DataFile", value: "", description: "Don't use any data file" }]);
      if (selectedDataFile) onChange(null);
      return;
    }

    if (isLoading) {
      setOptions([{ label: "No DataFile", value: "", description: "Don't use any data file" }]);
      return;
    }

    const dataFileOptions: DataFileOption[] = dataFiles.map((dataFile: DataFileListItem) => ({
      label: `${dataFile.name} (${dataFile.filename})`,
      value: dataFile.name,
      description: `${dataFile.file_type?.toUpperCase()} • ${Math.round((dataFile.file_content?.length || 0) / 1024)} KB`
    }));

    setOptions([
      { label: "No DataFile", value: "", description: "Don't use any data file" },
      {
        label: "+ Create New DataFile",
        value: "CREATE_NEW",
        description: "Create a new data file"
      },
      ...dataFileOptions
    ]);
  }, [dataFiles, isLanguageCompatible, isLoading, selectedDataFile, onChange]);

  const handleDropdownChange = (e: { value: string }) => {
    if (e.value === "CREATE_NEW") {
      setShowCreateDialog(true);
      return;
    }
    onChange(e.value || null);
  };

  const updateFormField = (field: keyof CreateDataFileForm, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSourceTypeChange = (sourceType: "file" | "textarea") => {
    setFormData((prev) => ({
      ...prev,
      source_type: sourceType,
      filename: sourceType === "textarea" ? "content.txt" : "",
      file_type: sourceType === "textarea" ? "txt" : "",
      file_content: sourceType === "textarea" ? textareaContent : ""
    }));
    if (sourceType === "file") setTextareaContent("");
  };

  const handleFileUpload = (event: any) => {
    const file = event.files[0];

    if (!file) return;

    const reader = new FileReader();
    const fileType = file.name.split(".").pop()?.toLowerCase() || "txt";
    const isImageFile = IMAGE_TYPES.includes(fileType);

    reader.onload = (e) => {
      const content = e.target?.result as string;

      setFormData((prev) => ({
        ...prev,
        filename: file.name,
        file_content: content,
        file_type: fileType
      }));
    };

    if (isImageFile) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleTextareaChange = (content: string) => {
    setTextareaContent(content);
    setFormData((prev) => ({ ...prev, file_content: content }));
  };

  const showToast = (severity: "success" | "error", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail });
  };

  const validateForm = () => {
    if (!formData.name || !formData.filename || !formData.file_content) {
      showToast("error", "Validation Error", "All fields are required");
      return false;
    }

    if (dataFiles.some((df: DataFileListItem) => df.name === formData.name)) {
      showToast("error", "Validation Error", "DataFile with this name already exists");
      return false;
    }

    return true;
  };

  const handleCreateDataFile = async () => {
    if (!validateForm()) return;

    console.log("Creating DataFile with data:", formData);

    try {
      const result = await createDataFile({ ...formData }).unwrap();

      showToast("success", "Success", `DataFile "${formData.filename}" created successfully`);
      resetForm();
      refetch();
      onChange(result.acid);
    } catch (error) {
      console.error("Error creating DataFile:", error);
      showToast("error", "Error", "Failed to create DataFile");
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setTextareaContent("");
    setShowCreateDialog(false);
  };

  if (!isLanguageCompatible) return null;

  const optionTemplate = (option: DataFileOption) => (
    <div className="flex flex-column">
      <span className="font-medium">{option.label}</span>
      {option.description && <small className="text-500">{option.description}</small>}
    </div>
  );

  const isTextFile = formData.file_type && !IMAGE_TYPES.includes(formData.file_type.toLowerCase());

  return (
    <>
      <Toast ref={toast} />

      <div className="field">
        <label htmlFor="datafile-selector" className="font-medium text-sm">
          <i className="pi pi-database mr-2"></i>
          DataFile (Optional)
        </label>

        <Dropdown
          id="datafile-selector"
          value={selectedDataFile || ""}
          options={options}
          onChange={handleDropdownChange}
          optionLabel="label"
          optionValue="value"
          placeholder="Select a DataFile"
          className="w-full mt-1"
          itemTemplate={optionTemplate}
          disabled={isLoading}
          emptyMessage="No DataFiles available"
        />

        <small className="text-500 mt-1">
          DataFiles provide data that your program can read during execution.
        </small>
      </div>

      <Dialog
        header="Create New DataFile"
        visible={showCreateDialog}
        style={{ width: "600px" }}
        onHide={resetForm}
        footer={
          <div className="flex gap-2">
            <Button label="Cancel" severity="secondary" onClick={resetForm} className="w-8rem" />
            <Button
              label="Create"
              loading={isCreating}
              disabled={!formData.name || !formData.filename || !formData.file_content}
              onClick={handleCreateDataFile}
              className="w-8rem"
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3">
          <div>
            <label className="font-medium text-sm">DataFile ID</label>
            <InputText
              value={formData.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              className="w-full mt-1"
              placeholder="my_data_file"
            />
          </div>

          <div>
            <label className="font-medium text-sm">Content Source</label>
            <div className="flex gap-4 mt-2">
              <div className="flex align-items-center">
                <RadioButton
                  inputId="source-textarea"
                  name="source_type"
                  value="textarea"
                  onChange={() => handleSourceTypeChange("textarea")}
                  checked={formData.source_type === "textarea"}
                />
                <label htmlFor="source-textarea" className="ml-2 cursor-pointer">
                  <i className="pi pi-pencil mr-1"></i>
                  Text Content
                </label>
              </div>
              <div className="flex align-items-center">
                <RadioButton
                  inputId="source-file"
                  name="source_type"
                  value="file"
                  onChange={() => handleSourceTypeChange("file")}
                  checked={formData.source_type === "file"}
                />
                <label htmlFor="source-file" className="ml-2 cursor-pointer">
                  <i className="pi pi-upload mr-1"></i>
                  Upload File
                </label>
              </div>
            </div>
          </div>

          {formData.source_type === "textarea" && (
            <div>
              <label className="font-medium text-sm">Filename</label>
              <InputText
                value={formData.filename}
                onChange={(e) => updateFormField("filename", e.target.value)}
                className="w-full mt-1"
                placeholder="data.txt"
              />
              <label className="font-medium text-sm mt-3 block">Content</label>
              <textarea
                value={textareaContent}
                onChange={(e) => handleTextareaChange(e.target.value)}
                className="w-full mt-1 p-2 border-1 border-300 border-round"
                rows={8}
                placeholder="Enter your data content here..."
              />
            </div>
          )}

          {formData.source_type === "file" && (
            <div>
              <label className="font-medium text-sm">Upload File</label>
              <FileUpload
                mode="basic"
                name="datafile"
                accept=".txt,.csv,.png,.jpg,.jpeg"
                maxFileSize={MAX_FILE_SIZE}
                customUpload
                auto
                uploadHandler={handleFileUpload}
                chooseLabel="Choose File"
              />
              <small>TXT, CSV, PNG, JPG, JPEG up to 15MB</small>
              {formData.filename && (
                <div className="mt-2 p-2 bg-green-50 border-round text-green-700">
                  <i className="pi pi-check-circle mr-2"></i>
                  {formData.filename} ({formData.file_type?.toUpperCase()})
                </div>
              )}
            </div>
          )}

          {isTextFile && (
            <div className="border-top-1 border-300 pt-3">
              <h6 className="font-medium text-sm mb-3">
                <i className="pi pi-cog mr-2"></i>
                Display Settings
              </h6>

              <div className="flex align-items-center mb-3">
                <Checkbox
                  inputId="is_editable"
                  checked={formData.is_editable}
                  onChange={(e) => updateFormField("is_editable", e.checked || false)}
                />
                <label htmlFor="is_editable" className="ml-2 cursor-pointer">
                  Allow students to edit this file
                </label>
              </div>

              <div className="grid">
                <div className="col-6">
                  <label className="font-medium text-sm">Rows</label>
                  <InputNumber
                    value={formData.rows}
                    onValueChange={(e) => updateFormField("rows", e.value || 10)}
                    min={5}
                    max={50}
                    className="w-full mt-1"
                  />
                </div>
                <div className="col-6">
                  <label className="font-medium text-sm">Columns</label>
                  <InputNumber
                    value={formData.cols}
                    onValueChange={(e) => updateFormField("cols", e.value || 50)}
                    min={20}
                    max={120}
                    className="w-full mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};
