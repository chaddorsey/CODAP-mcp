"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateItemByCaseID = exports.updateItemByIndex = exports.updateItemByID = exports.createItems = exports.getItemBySearch = exports.getItemByCaseID = exports.getItemByIndex = exports.getItemByID = exports.getAllItems = exports.getItemCount = exports.addCasesToSelection = exports.selectCases = exports.getSelectionList = exports.updateCases = exports.updateCaseById = exports.createChildCase = exports.createSingleOrParentCase = exports.getCaseByFormulaSearch = exports.getCaseBySearch = exports.getCaseByID = exports.getCaseByIndex = exports.getCaseCount = exports.createCollectionFromAttribute = exports.updateAttributePosition = exports.updateAttribute = exports.createNewAttribute = exports.getAttributeList = exports.getAttribute = exports.ensureUniqueCollectionName = exports.createNewCollection = exports.createChildCollection = exports.createParentCollection = exports.getCollection = exports.getCollectionList = exports.addDataContextChangeListener = exports.addDataContextsListListener = exports.createDataContextFromURL = exports.createDataContext = exports.getDataContext = exports.getListOfDataContexts = exports.addComponentListener = exports.selectSelf = exports.createTable = exports.initializePlugin = exports.sendMessage = void 0;
const codap_interface_1 = require("./codap-interface");
////////////// internal helper functions //////////////
const ctxStr = (contextName) => `dataContext[${contextName}]`;
const collStr = (collectionName) => `collection[${collectionName}]`;
const createMessage = (action, resource, values) => {
    return {
        action,
        resource,
        values
    };
};
const sendMessage = async (action, resource, values) => {
    const message = createMessage(action, resource, values);
    return await codap_interface_1.codapInterface.sendRequest(message);
};
exports.sendMessage = sendMessage;
////////////// public API //////////////
const initializePlugin = async (options) => {
    const { pluginName, version, dimensions } = options;
    const interfaceConfig = {
        name: pluginName,
        version,
        dimensions
    };
    return await codap_interface_1.codapInterface.init(interfaceConfig);
};
exports.initializePlugin = initializePlugin;
////////////// component functions //////////////
const createTable = async (dataContext, datasetName) => {
    const values = {
        type: "caseTable",
        dataContext
    };
    if (datasetName) {
        values.name = datasetName;
    }
    return (0, exports.sendMessage)("create", "component", values);
};
exports.createTable = createTable;
// Selects this component. In CODAP this will bring this component to the front.
const selectSelf = () => {
    const selectComponent = async function (id) {
        return codap_interface_1.codapInterface.sendRequest({
            action: "notify",
            resource: `component[${id}]`,
            values: { request: "select" }
        }, (result) => {
            if (!result.success) {
                // eslint-disable-next-line no-console
                console.log("selectSelf failed");
            }
        });
    };
    codap_interface_1.codapInterface.sendRequest({ action: "get", resource: "interactiveFrame" }, (result) => {
        if (result.success) {
            return selectComponent(result.values.id);
        }
    });
};
exports.selectSelf = selectSelf;
const addComponentListener = (callback) => {
    codap_interface_1.codapInterface.on("notify", "component", callback);
};
exports.addComponentListener = addComponentListener;
////////////// data context functions //////////////
const getListOfDataContexts = () => {
    return (0, exports.sendMessage)("get", "dataContextList");
};
exports.getListOfDataContexts = getListOfDataContexts;
const getDataContext = (dataContextName) => {
    return (0, exports.sendMessage)("get", ctxStr(dataContextName));
};
exports.getDataContext = getDataContext;
const createDataContext = (dataContextName) => {
    return (0, exports.sendMessage)("create", "dataContext", { name: dataContextName });
};
exports.createDataContext = createDataContext;
const createDataContextFromURL = (url) => {
    return (0, exports.sendMessage)("create", "dataContextFromURL", { "URL": url });
};
exports.createDataContextFromURL = createDataContextFromURL;
const addDataContextsListListener = (callback) => {
    codap_interface_1.codapInterface.on("notify", "documentChangeNotice", callback);
};
exports.addDataContextsListListener = addDataContextsListListener;
const addDataContextChangeListener = (dataContextName, callback) => {
    codap_interface_1.codapInterface.on("notify", `dataContextChangeNotice[${dataContextName}]`, callback);
};
exports.addDataContextChangeListener = addDataContextChangeListener;
////////////// collection functions //////////////
const getCollectionList = (dataContextName) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.collectionList`);
};
exports.getCollectionList = getCollectionList;
const getCollection = (dataContextName, collectionName) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.${collStr(collectionName)}`);
};
exports.getCollection = getCollection;
const createParentCollection = (dataContextName, collectionName, attrs) => {
    const resource = `${ctxStr(dataContextName)}.collection`;
    const values = {
        "name": collectionName,
        "title": collectionName,
        "parent": "_root_"
    };
    if (attrs) {
        values.attrs = attrs;
    }
    return (0, exports.sendMessage)("create", resource, values);
};
exports.createParentCollection = createParentCollection;
const createChildCollection = (dataContextName, collectionName, parentCollectionName, attrs) => {
    const resource = `${ctxStr(dataContextName)}.collection`;
    const values = {
        "name": collectionName,
        "title": collectionName,
        "parent": parentCollectionName
    };
    if (attrs) {
        values.attrs = attrs;
    }
    return (0, exports.sendMessage)("create", resource, values);
};
exports.createChildCollection = createChildCollection;
const createNewCollection = (dataContextName, collectionName, attrs) => {
    const resource = `${ctxStr(dataContextName)}.collection`;
    const values = {
        "name": collectionName,
        "title": collectionName,
    };
    if (attrs) {
        values.attrs = attrs;
    }
    return (0, exports.sendMessage)("create", resource, values);
};
exports.createNewCollection = createNewCollection;
const ensureUniqueCollectionName = async (dataContextName, collectionName, index) => {
    index = index || 0;
    const uniqueName = `${collectionName}${index !== 0 ? index : ""}`;
    const getCollMessage = {
        "action": "get",
        "resource": `${ctxStr(dataContextName)}.collection[${uniqueName}]`
    };
    const result = await new Promise((resolve) => {
        codap_interface_1.codapInterface.sendRequest(getCollMessage, (res) => {
            resolve(res);
        });
    });
    if (result.success) {
        // guard against runaway loops
        if (index >= 100) {
            return undefined;
        }
        return (0, exports.ensureUniqueCollectionName)(dataContextName, collectionName, index + 1);
    }
    else {
        return uniqueName;
    }
};
exports.ensureUniqueCollectionName = ensureUniqueCollectionName;
////////////// attribute functions //////////////
const getAttribute = (dataContextName, collectionName, attributeName) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.attribute[${attributeName}]`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getAttribute = getAttribute;
const getAttributeList = (dataContextName, collectionName) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.attributeList`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getAttributeList = getAttributeList;
const createNewAttribute = (dataContextName, collectionName, attributeName) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.attribute`;
    const values = {
        "name": attributeName,
        "title": attributeName,
    };
    return (0, exports.sendMessage)("create", resource, values);
};
exports.createNewAttribute = createNewAttribute;
const updateAttribute = (dataContextName, collectionName, attributeName, attribute, values) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.attribute[${attributeName}]`;
    return (0, exports.sendMessage)("update", resource, values);
};
exports.updateAttribute = updateAttribute;
const updateAttributePosition = (dataContextName, collectionName, attrName, newPosition) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.attributeLocation[${attrName}]`;
    return (0, exports.sendMessage)("update", resource, {
        "collection": collectionName,
        "position": newPosition
    });
};
exports.updateAttributePosition = updateAttributePosition;
const createCollectionFromAttribute = (dataContextName, oldCollectionName, attr, parent) => {
    // check if a collection for the attribute already exists
    const getCollectionMessage = createMessage("get", `${ctxStr(dataContextName)}.${collStr(attr.name)}`);
    return codap_interface_1.codapInterface.sendRequest(getCollectionMessage, async (result) => {
        // since you can't "re-parent" collections we need to create a temp top level collection, move the attribute,
        // and then check if CODAP deleted the old collection as it became empty and if so rename the new collection
        const moveCollection = result.success && (result.values.attrs.length === 1 || attr.name === oldCollectionName);
        const newCollectionName = moveCollection ? await (0, exports.ensureUniqueCollectionName)(dataContextName, attr.name, 0) : attr.name;
        if (newCollectionName === undefined) {
            return;
        }
        const _parent = parent === "root" ? "_root_" : parent;
        const createCollectionRequest = createMessage("create", `${ctxStr(dataContextName)}.collection`, {
            "name": newCollectionName,
            "title": newCollectionName,
            parent: _parent,
        });
        return codap_interface_1.codapInterface.sendRequest(createCollectionRequest, (createCollResult) => {
            if (createCollResult.success) {
                const moveAttributeRequest = createMessage("update", `${ctxStr(dataContextName)}.${collStr(oldCollectionName)}.attributeLocation[${attr.name}]`, {
                    "collection": newCollectionName,
                    "position": 0
                });
                return codap_interface_1.codapInterface.sendRequest(moveAttributeRequest);
            }
        });
    });
};
exports.createCollectionFromAttribute = createCollectionFromAttribute;
////////////// case functions //////////////
const getCaseCount = (dataContextName, collectionName) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.caseCount`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getCaseCount = getCaseCount;
const getCaseByIndex = (dataContextName, collectionName, index) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.caseByIndex[${index}]`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getCaseByIndex = getCaseByIndex;
const getCaseByID = (dataContextName, caseID) => {
    const resource = `${ctxStr(dataContextName)}.caseByID[${caseID}]`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getCaseByID = getCaseByID;
const getCaseBySearch = (dataContextName, collectionName, search) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.caseSearch[${search}]`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getCaseBySearch = getCaseBySearch;
const getCaseByFormulaSearch = (dataContextName, collectionName, search) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.caseFormulaSearch[${search}]`;
    return (0, exports.sendMessage)("get", resource);
};
exports.getCaseByFormulaSearch = getCaseByFormulaSearch;
const createSingleOrParentCase = (dataContextName, collectionName, values) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.case`;
    return (0, exports.sendMessage)("create", resource, values);
};
exports.createSingleOrParentCase = createSingleOrParentCase;
const createChildCase = (dataContextName, collectionName, parentCaseID, values) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.case`;
    const valuesWithParent = [
        {
            parent: parentCaseID,
            values
        }
    ];
    return (0, exports.sendMessage)("create", resource, valuesWithParent);
};
exports.createChildCase = createChildCase;
const updateCaseById = (dataContextName, caseID, values) => {
    const resource = `${ctxStr(dataContextName)}.caseByID[${caseID}]`;
    const updateValues = {
        values
    };
    return (0, exports.sendMessage)("update", resource, updateValues);
};
exports.updateCaseById = updateCaseById;
const updateCases = (dataContextName, collectionName, values) => {
    const resource = `${ctxStr(dataContextName)}.${collStr(collectionName)}.case`;
    return (0, exports.sendMessage)("update", resource, values);
};
exports.updateCases = updateCases;
const getSelectionList = (dataContextName) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.selectionList`);
};
exports.getSelectionList = getSelectionList;
const selectCases = (dataContextName, caseIds) => {
    return (0, exports.sendMessage)("create", `${ctxStr(dataContextName)}.selectionList`, caseIds);
};
exports.selectCases = selectCases;
const addCasesToSelection = (dataContextName, caseIds) => {
    return (0, exports.sendMessage)("update", `${ctxStr(dataContextName)}.selectionList`, caseIds);
};
exports.addCasesToSelection = addCasesToSelection;
////////////// item functions //////////////
const getItemCount = (dataContextName) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.itemCount`);
};
exports.getItemCount = getItemCount;
const getAllItems = (dataContextName) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.itemSearch[*]`);
};
exports.getAllItems = getAllItems;
const getItemByID = (dataContextName, itemID) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.itemByID[${itemID}]`);
};
exports.getItemByID = getItemByID;
const getItemByIndex = (dataContextName, index) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.item[${index}]`);
};
exports.getItemByIndex = getItemByIndex;
const getItemByCaseID = (dataContextName, caseID) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.itemByCaseID[${caseID}]`);
};
exports.getItemByCaseID = getItemByCaseID;
const getItemBySearch = (dataContextName, search) => {
    return (0, exports.sendMessage)("get", `${ctxStr(dataContextName)}.itemSearch[${search}]`);
};
exports.getItemBySearch = getItemBySearch;
const createItems = (dataContextName, items) => {
    return (0, exports.sendMessage)("create", `${ctxStr(dataContextName)}.item`, items);
};
exports.createItems = createItems;
const updateItemByID = (dataContextName, itemID, values) => {
    return (0, exports.sendMessage)("update", `${ctxStr(dataContextName)}.itemByID[${itemID}]`, values);
};
exports.updateItemByID = updateItemByID;
const updateItemByIndex = (dataContextName, index, values) => {
    return (0, exports.sendMessage)("update", `${ctxStr(dataContextName)}.item[${index}]`, values);
};
exports.updateItemByIndex = updateItemByIndex;
const updateItemByCaseID = (dataContextName, caseID, values) => {
    return (0, exports.sendMessage)("update", `${ctxStr(dataContextName)}.itemByCaseID[${caseID}]`, values);
};
exports.updateItemByCaseID = updateItemByCaseID;
