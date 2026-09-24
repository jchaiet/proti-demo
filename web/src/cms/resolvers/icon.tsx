import { ArrowRight, ArrowLeft, Download, ExternalLink } from "lucide-react";

import {
  MdArrowForward,
  MdArrowBack,
  MdDownload,
  MdOpenInNew,
} from "react-icons/md";

import type { CmsIcon } from "@/cms/types";

export function resolveIcon(icon?: CmsIcon) {
  switch (icon) {
    case "lucide:arrow-right":
      return <ArrowRight size="1em" />;

    case "lucide:arrow-left":
      return <ArrowLeft size="1em" />;

    case "lucide:download":
      return <Download size="1em" />;

    case "lucide:external-link":
      return <ExternalLink size="1em" />;

    case "material:arrow-right":
      return <MdArrowForward size="1em" />;

    case "material:arrow-left":
      return <MdArrowBack size="1em" />;

    case "material:download":
      return <MdDownload size="1em" />;

    case "material:external-link":
      return <MdOpenInNew size="1em" />;

    default:
      return undefined;
  }
}
