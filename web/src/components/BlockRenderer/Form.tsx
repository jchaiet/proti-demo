"use client";

import { FormBlock, type FormBlockProps } from "mino-ui/blocks/FormBlock";
import type { CmsIcon } from "@/cms/types";
import { resolveIcon } from "@/cms/resolvers/icon";

export interface FormRendererProps extends Omit<FormBlockProps, "onSubmit"> {
  formKey: string;
  submitButtonIconName?: CmsIcon;
}

type SubmitHandler = NonNullable<FormBlockProps["onSubmit"]>;

type SubmitArgs = Parameters<SubmitHandler>;

export function Form({
  formKey,
  submitButtonIconName,
  submitButtonProps,
  ...props
}: FormRendererProps) {
  const icon = resolveIcon(submitButtonIconName);

  const handleSubmit = async (...args: SubmitArgs) => {
    console.log("Form submitted:", formKey, ...args);
  };

  return (
    <FormBlock
      {...props}
      submitButtonProps={{
        ...submitButtonProps,

        ...(icon
          ? {
              icon,
            }
          : {}),
      }}
      onSubmit={handleSubmit}
    />
  );
}
