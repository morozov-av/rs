/**
 * Unit tests for graderUtils helper functions.
 */
import { getDisplayCategory, getQuestionTypeLabel } from "@components/routes/GraderV2/graderUtils";

describe("graderUtils", () => {
  describe("getDisplayCategory", () => {
    it("returns 'tabular' for mchoice", () => {
      expect(getDisplayCategory("mchoice")).toBe("tabular");
    });

    it("returns 'tabular' for fillintheblank", () => {
      expect(getDisplayCategory("fillintheblank")).toBe("tabular");
    });

    it("returns 'tabular' for shortanswer", () => {
      expect(getDisplayCategory("shortanswer")).toBe("tabular");
    });

    it("returns 'tabular' for poll", () => {
      expect(getDisplayCategory("poll")).toBe("tabular");
    });

    it("returns 'tabular' for matching", () => {
      expect(getDisplayCategory("matching")).toBe("tabular");
    });

    it("returns 'tabular' for dragndrop", () => {
      expect(getDisplayCategory("dragndrop")).toBe("tabular");
    });

    it("returns 'tabular' for clickablearea", () => {
      expect(getDisplayCategory("clickablearea")).toBe("tabular");
    });

    it("returns 'code' for activecode", () => {
      expect(getDisplayCategory("activecode")).toBe("code");
    });

    it("returns 'parsons' for parsonsprob", () => {
      expect(getDisplayCategory("parsonsprob")).toBe("parsons");
    });

    it("returns 'tabular' for unknown types", () => {
      expect(getDisplayCategory("some_unknown_type")).toBe("tabular");
    });
  });

  describe("getQuestionTypeLabel", () => {
    it("returns 'Multiple Choice' for mchoice", () => {
      expect(getQuestionTypeLabel("mchoice")).toBe("Multiple Choice");
    });

    it("returns 'Fill in the Blank' for fillintheblank", () => {
      expect(getQuestionTypeLabel("fillintheblank")).toBe("Fill in the Blank");
    });

    it("returns 'Short Answer' for shortanswer", () => {
      expect(getQuestionTypeLabel("shortanswer")).toBe("Short Answer");
    });

    it("returns 'Active Code' for activecode", () => {
      expect(getQuestionTypeLabel("activecode")).toBe("Active Code");
    });

    it("returns 'Parsons Problem' for parsonsprob", () => {
      expect(getQuestionTypeLabel("parsonsprob")).toBe("Parsons Problem");
    });

    it("returns the raw string for unknown types", () => {
      expect(getQuestionTypeLabel("xyz")).toBe("xyz");
    });
  });
});

