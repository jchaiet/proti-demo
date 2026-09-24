import { PortableText } from "@portabletext/react";

import type { PortableTextBlock } from "@portabletext/types";

import styles from "./BlogTemplate.module.css";

export interface BlogBodyProps {
  value: PortableTextBlock[] | undefined;
}

export function BlogBody({ value }: BlogBodyProps) {
  if (!value?.length) {
    return null;
  }

  return (
    <div className={styles.body}>
      <PortableText value={value} />
    </div>
  );
}
