export type ShowImageMessage = {
  type: "show_image";
  image: {
    type: "Buffer";
    data: number[];
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

export type HostToWebviewMessages = ShowImageMessage | TransformWebviewMessage;

export type WebviewToHostMessages =
  | WebviewReadyMessage
  | WebviewTransformMessage;
