// src/codap-helper.ts
import { codapInterface } from "./codap-interface";

type AttrType = "categorical" | "numeric";

export interface Attribute {
  name: string;
  type: AttrType;
}

export interface Case {
  id?: string;
  values: Record<string, string | number>;
}

export interface DataSet {
  name: string;
  attributes: Attribute[];
  cases?: Case[];
}

export const codapHelper = {
  async createDataContext(dataSet: DataSet): Promise<void> {
    await codapInterface.sendRequest({
      action: "create",
      resource: "dataContext",
      values: {
        name: dataSet.name,
        collections: [
          {
            name: "cases",
            labels: {
              singleCase: "case",
              pluralCase: "cases"
            },
            attrs: dataSet.attributes.map(attr => ({
              name: attr.name,
              type: attr.type
            }))
          }
        ]
      }
    });

    if (dataSet.cases?.length) {
      await codapHelper.createCases(dataSet.name, dataSet.cases);
    }
  },

  async createCases(contextName: string, cases: Case[]): Promise<void> {
    const caseData = cases.map(c => ({ values: c.values }));
    await codapInterface.sendRequest({
      action: "create",
      resource: `dataContext[${contextName}].item`,
      values: caseData
    });
  },

  async clearDataContext(contextName: string): Promise<void> {
    await codapInterface.sendRequest({
      action: "delete",
      resource: `dataContext[${contextName}]`
    });
  },

  async getInteractiveState(): Promise<Record<string, unknown>> {
    return codapInterface.getInteractiveState() as Record<string, unknown>;
  },

  async updateInteractiveState(updates: Record<string, unknown>): Promise<void> {
    codapInterface.updateInteractiveState(updates);
  }
};

