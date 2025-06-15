import { IframePhoneRpcEndpoint } from "iframe-phone";

export interface IConfig {
  stateHandler?: (state: unknown) => void;
  customInteractiveStateHandler?: boolean;
  name?: string;
  title?: string;
  version?: string;
  dimensions?: { width: number; height: number };
  preventBringToFront?: boolean;
  preventDataContextReorg?: boolean;
}

export interface ClientNotification {
  action: "get" | "update" | "notify";
  resource: string;
  values: unknown;
  operation?: string;
}
export type ClientHandler = (notification: ClientNotification) => void;

let connection: IframePhoneRpcEndpoint | null = null;
let connectionState = "preinit";
let interactiveState: unknown = {};

const notificationSubscribers: {
  action: "get" | "update" | "notify";
  resource: string;
  operation?: string;
  handler: ClientHandler;
}[] = [];

function notificationHandler(
  request: ClientNotification,
  callback: (response: { success: boolean; values?: unknown }) => void
) {
  connectionState = "active";

  notificationSubscribers.forEach(({ action, resource, operation, handler }) => {
    if (
      request.action === action &&
      request.resource === resource &&
      (!operation || request.operation === operation)
    ) {
      handler(request);
    }
  });

  callback({ success: true });
}

export const codapInterface = {
  init(config: IConfig, cb?: (state: unknown) => void): Promise<unknown> {
    connection = new (IframePhoneRpcEndpoint as any)({
      rpcHandler: notificationHandler,
      channelName: "data-interactive",
      targetWindow: window.parent,
      targetOrigin: "*"
    });
    connectionState = "init";

    if (config.stateHandler) {
      config.stateHandler(interactiveState);
    }
    if (cb) {
      cb(interactiveState);
    }

    return Promise.resolve(interactiveState);
  },

  getConnectionState(): string {
    return connectionState;
  },

  getInteractiveState(): unknown {
    return interactiveState;
  },

  updateInteractiveState(state: unknown): void {
    if (typeof state === "object" && state !== null) {
      interactiveState = { ...(interactiveState as object), ...(state as object) };
    }
  },

  sendRequest(message: Record<string, unknown>): Promise<unknown> {
    if (!connection) {
      return Promise.reject(new Error("CODAP connection not initialized"));
    }
    return new Promise((resolve, reject) => {
      (connection as any).call(message, (response: any) => {
        if (response?.success) {
          resolve(response.values ?? response);
        } else {
          reject(new Error("CODAP request failed: " + JSON.stringify(response)));
        }
      });
    });
  },

  on(
    action: "get" | "update" | "notify",
    resource: string,
    handler: ClientHandler,
    operation?: string
  ): void {
    notificationSubscribers.push({ action, resource, operation, handler });
  }
};

