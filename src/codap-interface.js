"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codapInterface = void 0;
const iframe_phone_1 = require("iframe-phone");
let connection = null;
let connectionState = "preinit";
const stats = {
    countDiReq: 0,
    countDiRplSuccess: 0,
    countDiRplFail: 0,
    countDiRplTimeout: 0,
    countCodapReq: 0,
    countCodapUnhandledReq: 0,
    countCodapRplSuccess: 0,
    countCodapRplFail: 0,
    timeDiFirstReq: null,
    timeDiLastReq: null,
    timeCodapFirstReq: null,
    timeCodapLastReq: null
};
const notificationSubscribers = [];
function matchResource(resourceName, resourceSpec) {
    return resourceSpec === "*" || resourceName === resourceSpec;
}
function notificationHandler(request, callback) {
    connectionState = "active";
    stats.countCodapReq++;
    stats.timeCodapLastReq = new Date();
    if (!stats.timeCodapFirstReq)
        {stats.timeCodapFirstReq = stats.timeCodapLastReq;}
    let returnMessage = { success: true };
    notificationSubscribers.forEach(sub => {
        if (sub.actionSpec === request.action &&
            matchResource(request.resource, sub.resourceSpec) &&
            (!sub.operation || sub.operation === request.values.operation)) {
            const rpt = sub.handler(request);
            if (rpt.success)
                {stats.countCodapRplSuccess++;}
            else
                {stats.countCodapRplFail++;}
            returnMessage = rpt;
        }
    });
    callback(returnMessage);
}
exports.codapInterface = {
    stats,
    init(iConfig, iCallback) {
        const getFrameReq = { action: "get", resource: "interactiveFrame" };
        const updateFrameReq = {
            action: "update", resource: "interactiveFrame", values: {
                name: iConfig.name,
                title: iConfig.title,
                version: iConfig.version,
                dimensions: iConfig.dimensions
            }
        };
        const phoneEndpoint = (0, iframe_phone_1.getIFrameEndpoint)();
        connection = new iframe_phone_1.IframePhoneRpcEndpoint(notificationHandler, "data-interactive", window.parent, window.location.origin, phoneEndpoint);
        if (!iConfig.customInteractiveStateHandler) {
            this.on("get", "interactiveState", (_) => ({ success: true, values: this.getInteractiveState() }));
        }
        return this.sendRequest([updateFrameReq, getFrameReq]).then((resp) => {
            const arr = resp;
            const saved = arr[1]?.values?.savedState;
            if (iCallback)
                {iCallback(saved);}
            return saved;
        });
    },
    getConnectionState() { return connectionState; },
    getConfig() { return null; },
    getInteractiveState() { return {}; },
    updateInteractiveState(_s) { },
    destroy() { connection = null; connectionState = "closed"; },
    sendRequest(message, callback) {
        return new Promise((resolve, reject) => {
            if (!connection)
                {return reject("No connection");}
            stats.countDiReq++;
            stats.timeDiLastReq = new Date();
            connection.call(message, (response) => {
                if (response?.success) {
                    stats.countDiRplSuccess++;
                    resolve(response);
                }
                else {
                    stats.countDiRplFail++;
                    reject(response);
                }
                if (callback)
                    {callback(response);}
            });
        });
    },
    on(actionSpec, resourceSpec, operation, handlerArg) {
        let op;
        let handlerFn;
        if (typeof operation === "function") {
            handlerFn = operation;
        }
        else {
            op = operation;
            handlerFn = handlerArg;
        }
        notificationSubscribers.push({ actionSpec, resourceSpec, operation: op, handler: handlerFn });
    },
    parseResourceSelector(iResource) {
        const result = {};
        iResource.split(".").forEach(seg => {
            const m = /(.+)\[(.+)\]/.exec(seg);
            if (m) {
                result[m[1]] = m[2];
                result.type = m[1];
            }
            else {
                result.type = seg;
            }
        });
        return result;
    }
};
