import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Fragment } from "react";
import { Controller } from "react-hook-form";
import toast from "react-hot-toast";

import { CreateExerciseFormProps } from "@/types/createExerciseForm";

export const CreateMultipleChoiceExercise = ({
  control,
  errors,
  watch,
  setValue
}: CreateExerciseFormProps) => {
  const choices = watch("choices");

  const addChoice = () => {
    const updatedChoices = [...choices, { text: "", feedback: "", correct: false }];

    setValue("choices", updatedChoices);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) {
      toast("At least two choices are required");
      return;
    }
    const updatedChoices = choices.filter((_, i) => i !== index);

    setValue("choices", updatedChoices);
  };

  return (
    <>
      {/* Question Prompt */}
      <div className="field col-12 pt-4">
        <span className="p-float-label">
          <Controller
            name="questionPrompt"
            control={control}
            rules={{
              required: "Question prompt is required",
              minLength: { value: 1, message: "Minimum 1 symbol required" },
              maxLength: { value: 10000, message: "Maximum 10000 symbols allowed" }
            }}
            render={({ field }) => (
              <InputTextarea
                id="questionPrompt"
                {...field}
                rows={3}
                autoResize
                maxLength={10000}
                placeholder=" "
                className={errors.questionPrompt ? "p-invalid" : ""}
              />
            )}
          />
          <label htmlFor="questionPrompt">Question Prompt</label>
        </span>
        {errors.questionPrompt && (
          <small className="p-error">{errors.questionPrompt.message}</small>
        )}
      </div>
      {choices.map((_, index) => (
        <Fragment key={index}>
          <div className="field col-12 md:col-4 pt-4">
            <span className="p-float-label">
              <Controller
                name={`choices.${index}.text`}
                control={control}
                rules={{ required: "Choice text is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id={`choice-${index}`}
                      {...field}
                      placeholder=" "
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    <label htmlFor={`choice-${index}`}>Choice {index + 1}</label>
                  </>
                )}
              />
            </span>
            {errors.choices && errors.choices[index]?.text && (
              <small className="p-error">{errors.choices[index]?.text.message}</small>
            )}
          </div>
          <div className="field col-12 md:col-6 pt-4">
            <span className="p-float-label">
              <Controller
                name={`choices.${index}.feedback`}
                control={control}
                rules={{ required: "Feedback is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <InputTextarea
                      id={`feedback-${index}`}
                      {...field}
                      autoResize
                      rows={1}
                      placeholder=" "
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    <label htmlFor={`feedback-${index}`}>Feedback {index + 1}</label>
                  </>
                )}
              />
            </span>
            {errors.choices && errors.choices[index]?.feedback && (
              <small className="p-error">{errors.choices[index]?.feedback.message}</small>
            )}
          </div>
          <div className="field col-12 md:col-1 pt-4 flex">
            <Controller
              name={`choices.${index}.correct`}
              control={control}
              render={({ field }) => (
                <div className="flex align-items-center flex-shrink-1 gap-1">
                  <Checkbox
                    inputId={`correct-${index}`}
                    checked={field.value}
                    onChange={(e) => field.onChange(e.checked)}
                  />
                  <label className="p-ml-2" htmlFor={`correct-${index}`}>
                    Correct
                  </label>
                </div>
              )}
            />
          </div>
          <div className="field col-12 md:col-1 pt-4 flex justify-content-center align-items-start">
            <Button
              icon="pi pi-trash"
              rounded
              outlined
              severity="danger"
              onClick={() => removeChoice(index)}
            />
          </div>
        </Fragment>
      ))}

      {/* Add Choice Button */}
      <div className="field col-12 flex align-items-center justify-content-center">
        <Button
          icon="pi pi-plus"
          rounded
          outlined
          severity="success"
          onClick={addChoice}
          visible={choices.length < 10}
          tooltip="Add Choice"
        />
      </div>
    </>
  );
};