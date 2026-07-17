import { MachineCatalogItem, MachineInventoryProcessItem, MaterialCatalogItem, TroquelCatalogItem } from "../catalogs/types.js";
export declare function calculateFlexoRegularFromRequest(payload: {
    selectedProcess?: string;
    selectedMachineConvencionalId?: string;
    selectedMachineDigitalId?: string;
    selectedTroquelId?: string;
    input: Record<string, unknown>;
}): Promise<{
    source: "database" | "files";
    catalogs: {
        materials: MaterialCatalogItem[];
        products: import("../catalogs/types.js").ProductCatalogItem[];
        troqueles: TroquelCatalogItem[];
        machines: MachineCatalogItem[];
        machineProcesses: MachineInventoryProcessItem[];
    };
    selection: {
        selectedProcess: string;
        troquel: TroquelCatalogItem | undefined;
        convencional: {
            material: MaterialCatalogItem | undefined;
            machine: MachineCatalogItem | undefined;
        };
        digital: {
            material: MaterialCatalogItem | undefined;
            machine: MachineCatalogItem | undefined;
        };
    };
    calculations: {
        convencional: import("../domain/flexo-regular-calculator.js").FlexoRegularCalculo;
        digital: import("../domain/flexo-regular-calculator.js").FlexoRegularCalculo;
    };
    activeCalculation: import("../domain/flexo-regular-calculator.js").FlexoRegularCalculo;
}>;
export declare function loadWebCatalogs(): Promise<{
    source: "database" | "files";
    materials: MaterialCatalogItem[];
    products: import("../catalogs/types.js").ProductCatalogItem[];
    troqueles: TroquelCatalogItem[];
    machines: MachineCatalogItem[];
    machineProcesses: MachineInventoryProcessItem[];
}>;
export declare function loadInventoryViews(): Promise<{
    source: "database" | "files";
    machines: {
        columns: string[];
        rows: MachineInventoryProcessItem[];
    };
    machineSummary: {
        columns: string[];
        rows: MachineCatalogItem[];
    };
    materials: {
        columns: string[];
        rows: MaterialCatalogItem[];
    };
    troqueles: {
        columns: string[];
        rows: TroquelCatalogItem[];
    };
    costs: {
        columns: string[];
        rows: {
            concepto: string | number | undefined;
            valor: string | number | undefined;
            unidad: string | number | undefined;
            categoria: string | number | undefined;
        }[];
    };
}>;
