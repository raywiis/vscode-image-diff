export type ShowImageMessage = {
  type: "show_image";
  image: {
    type: "Buffer";
    data: number[];
  };
  options: {
    minScaleOne: boolean;
    showDiffByDefault: boolean;
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

export type HostToWebviewMessages =
  | ShowImageMessage
  | TransformWebviewMessage
  | ToggleDiffMessage
  | EnableTransformReport;

export type WebviewToHostMessages =
  | WebviewReadyMessage
  | WebviewTransformMessage
  | WebviewChangeDiffAlignMessage;
