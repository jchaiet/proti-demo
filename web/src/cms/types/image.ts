export interface CmsImage {
  /**
   * Local, deterministic image available only to opt-in visual regression runs.
   * Not authored by Sanity Studio and ignored when PROTI_VISUAL_FIXTURES is off.
   */
  visualFixture?: {
    src: string;
    width: number;
    height: number;
  };

  asset?: {
    _ref?: string;

    _type?: "reference";
  };

  crop?: {
    _type?: "sanity.imageCrop";

    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  hotspot?: {
    _type?: "sanity.imageHotspot";

    x?: number;
    y?: number;

    height?: number;
    width?: number;
  };

  alt?: string;
}
