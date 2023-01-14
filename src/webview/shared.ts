
export type ShowImageMessage = {
  type: 'show_image',
  image: {
    type: 'Buffer',
    data: number[],
  }
};

export type WebviewReadyMessage = {
  type: 'ready';
};

export type HostToWebviewMessages = ShowImageMessage;

export type WebviewToHostMessages = WebviewReadyMessage;
