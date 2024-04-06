export type ShowImageMessage = {
  type: "show_image";
  image: {
    type: "Buffer";
    data: number[];
  };
  options: {
    minScaleOne: boolean;
    showDiffByDefault: boolean;
    imageRendering: "auto" | "pixelated";
  };
};

export type EnableTransformReport = {
  type: "enable_transform_report";
};

export type TransformWebviewMessage = {
  type: "transform";
  data: { x: number; y: number; scale: number };
};

export type WebviewReadyMessage = {
  type: "ready";
};

export type WebviewTransformMessage = {
  type: "transform";
  data: { x: number; y: number; scale: number };
};

export type WebviewChangeDiffAlignMessage = {
  type: "change_align";
  data: string;
};

export type ToggleDiffMessage = {
  type: "toggle_diff";
};

export type ToggleSwipeForOriginalMessage = {
  type: "toggle_swipe_original";
};

export type ToggleSwipeForChangedMessage = {
  type: "toggle_swipe_changed";
};

export type OffsetXYMessage = {
  type: "offset_xy";
  data: { dx: number; dy: number };
};

export type WebviewDimensionReport = {
  type: "original_swipe_adjustment";
  data: { width: number; height: number };
};

export type HostToWebviewMessages =
  | ShowImageMessage
  | TransformWebviewMessage
  | ToggleDiffMessage
  | ToggleSwipeForOriginalMessage
  | ToggleSwipeForChangedMessage
  | OffsetXYMessage
  | EnableTransformReport;

export type WebviewToHostMessages =
  | WebviewReadyMessage
  | WebviewTransformMessage
  | WebviewDimensionReport
  | WebviewChangeDiffAlignMessage;
