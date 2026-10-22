import type { Dispatch, ReactNode } from "react";

import type { FieldDef } from "@/lib/admin/schema";

import type { EditorHandlers } from "../EditorLayout";
import type { EditorAction, EditorState } from "../state";
import { CollectionField } from "./CollectionField";
import { CopyField } from "./CopyField";
import { CopyListField } from "./CopyListField";
import { FactField } from "./FactField";
import { IconField } from "./IconField";
import { ImageField } from "./ImageField";
import { MonthField } from "./MonthField";
import { ResumeField } from "./ResumeField";
import { SectionsField } from "./SectionsField";
import { SelectField } from "./SelectField";
import { factRefIn, factValue, type FieldScope } from "./shared";
import { TagsField } from "./TagsField";
import { TextListField } from "./TextListField";
import { ToggleField } from "./ToggleField";

export type { FieldScope };

export type FieldRendererProps = Readonly<{
  field: FieldDef;
  scope: FieldScope;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  actions?: ReactNode;
}>;

// Whether a field applies right now, e.g. the live URL only while the app is public.
export function isShown(field: FieldDef, scope: FieldScope, state: EditorState): boolean {
  if (!field.showWhen) {
    return true;
  }

  return String(factValue(state.draft, factRefIn(field.showWhen.fact, scope))) === field.showWhen.equals;
}

export function FieldRenderer(props: FieldRendererProps) {
  const { field, scope, state } = props;

  if (!isShown(field, scope, state)) {
    return null;
  }

  switch (field.kind) {
    case "text":
    case "paragraph":
      return <CopyField {...props} field={field} />;
    case "fact":
      return <FactField {...props} field={field} />;
    case "month":
      return <MonthField {...props} field={field} />;
    case "select":
      return <SelectField {...props} field={field} />;
    case "toggle":
      return <ToggleField {...props} field={field} />;
    case "tags":
      return <TagsField {...props} field={field} />;
    case "image":
      return <ImageField {...props} field={field} />;
    case "resume":
      return <ResumeField {...props} field={field} />;
    case "icon":
      return <IconField {...props} field={field} />;
    case "textList":
      return <TextListField {...props} field={field} />;
    case "copyList":
      return <CopyListField {...props} field={field} />;
    case "collection":
      return <CollectionField {...props} field={field} />;
    case "sections":
      return <SectionsField {...props} field={field} />;
  }
}
