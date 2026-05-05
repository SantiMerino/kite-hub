"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_GROUP_LABEL, type AuditActionGroupId } from "../action-groups";

const GROUP_IDS = Object.keys(AUDIT_ACTION_GROUP_LABEL) as AuditActionGroupId[];

type AuditActionGroupSelectProps = {
  name: string;
  defaultValue: AuditActionGroupId;
};

export default function AuditActionGroupSelect({ name, defaultValue }: AuditActionGroupSelectProps) {
  const [value, setValue] = useState<AuditActionGroupId>(defaultValue);

  return (
    <div className="w-full md:max-w-xs">
      <input type="hidden" name={name} value={value} readOnly />
      <Select value={value} onValueChange={(v) => setValue(v as AuditActionGroupId)}>
        <SelectTrigger id="audit-group" className="w-full bg-background text-foreground">
          <SelectValue placeholder="Tipo de acción" />
        </SelectTrigger>
        <SelectContent>
          {GROUP_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {AUDIT_ACTION_GROUP_LABEL[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
