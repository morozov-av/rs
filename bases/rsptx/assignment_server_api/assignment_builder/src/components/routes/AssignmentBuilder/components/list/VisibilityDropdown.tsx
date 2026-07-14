import { Popover, Stack, Text, UnstyledButton } from "@mantine/core";
import { useState } from "react";

import { Icon } from "@components/ui/Icon";

import { Assignment } from "@/types/assignment";

import {
  adjustDatesForHiddenOnChange,
  adjustDatesForVisibleOnChange,
  applyModeDateDefaults
} from "../edit/visibilityDates";
import { getVisibilityMode, getVisibilityValues, VisibilityMode } from "../edit/visibilityMode";

import { getVisibilityStatus, VisibilityChip } from "./VisibilityStatusBadge";
import { VisibilityModeFields } from "./VisibilityModeFields";

import styles from "./VisibilityStatusBadge.module.css";

interface VisibilityDropdownProps {
  assignment: Assignment;
  onChange: (
    assignment: Assignment,
    data: { visible: boolean; visible_on: string | null; hidden_on: string | null }
  ) => void;
}

const modeOf = (assignment: Assignment): VisibilityMode =>
  getVisibilityMode(assignment.visible, assignment.visible_on, assignment.hidden_on);

export const VisibilityDropdown = ({ assignment, onChange }: VisibilityDropdownProps) => {
  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<VisibilityMode>(() => modeOf(assignment));
  const [visibleOn, setVisibleOn] = useState<string | null>(assignment.visible_on);
  const [hiddenOn, setHiddenOn] = useState<string | null>(assignment.hidden_on);

  const status = getVisibilityStatus(assignment);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMode(modeOf(assignment));
      setVisibleOn(assignment.visible_on);
      setHiddenOn(assignment.hidden_on);
    }
    setOpened(next);
  };

  const handleModeChange = (newMode: VisibilityMode) => {
    const dates = applyModeDateDefaults(newMode, visibleOn, hiddenOn);

    setMode(newMode);
    setVisibleOn(dates.visibleOn);
    setHiddenOn(dates.hiddenOn);
    onChange(assignment, getVisibilityValues(newMode, dates.visibleOn, dates.hiddenOn));
  };

  const handleVisibleOnChange = (val: string) => {
    const dates = adjustDatesForVisibleOnChange(mode, val, hiddenOn);

    setVisibleOn(dates.visibleOn);
    setHiddenOn(dates.hiddenOn);
    onChange(assignment, getVisibilityValues(mode, dates.visibleOn, dates.hiddenOn));
  };

  const handleHiddenOnChange = (val: string) => {
    const dates = adjustDatesForHiddenOnChange(mode, visibleOn, val);

    setVisibleOn(dates.visibleOn);
    setHiddenOn(dates.hiddenOn);
    onChange(assignment, getVisibilityValues(mode, dates.visibleOn, dates.hiddenOn));
  };

  return (
    <Popover
      width={300}
      position="bottom"
      withArrow
      trapFocus
      returnFocus
      opened={opened}
      onChange={handleOpenChange}
    >
      <Popover.Target>
        <UnstyledButton
          className={styles.trigger}
          data-expanded={opened || undefined}
          onClick={() => handleOpenChange(!opened)}
          aria-label={`${status.label}. Change visibility`}
          title={status.tooltip || "Click to change visibility"}
        >
          <VisibilityChip status={status} />
          <span className={styles.chevron}>
            <Icon name="chevron-down" size={13} color="currentColor" />
          </span>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600} size="sm">
            Visibility status
          </Text>
          <VisibilityModeFields
            mode={mode}
            visibleOn={visibleOn}
            hiddenOn={hiddenOn}
            onModeChange={handleModeChange}
            onVisibleOnChange={handleVisibleOnChange}
            onHiddenOnChange={handleHiddenOnChange}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
