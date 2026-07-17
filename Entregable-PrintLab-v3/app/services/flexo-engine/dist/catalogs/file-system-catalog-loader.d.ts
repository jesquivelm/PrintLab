import { CostCatalogsFile, MachineInventoryProcessItem, MaterialCatalogItem, ProductCatalogItem, TroquelCatalogItem } from "./types.js";
export interface LoadedCatalogs {
    costs: CostCatalogsFile;
    materials: MaterialCatalogItem[];
    products: ProductCatalogItem[];
    troqueles: TroquelCatalogItem[];
    machines: MachineInventoryProcessItem[];
}
export declare function loadCatalogsFromDataDir(dataDir: string): Promise<LoadedCatalogs>;
