import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CostCatalogsFile,
  MachineInventoryProcessItem,
  MaterialCatalogItem,
  ProductCatalogItem,
  TroquelCatalogItem
} from "./types.js";

async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

async function readJsonWithFallback<T>(
  primaryPath: string,
  fallbackPath: string
): Promise<T> {
  try {
    await access(primaryPath);
    return await readJsonFile<T>(primaryPath);
  } catch {
    return await readJsonFile<T>(fallbackPath);
  }
}

export interface LoadedCatalogs {
  costs: CostCatalogsFile;
  materials: MaterialCatalogItem[];
  products: ProductCatalogItem[];
  troqueles: TroquelCatalogItem[];
  machines: MachineInventoryProcessItem[];
}

export async function loadCatalogsFromDataDir(
  dataDir: string
): Promise<LoadedCatalogs> {
  const catalogsDir = resolve(dataDir, "catalogs");

  return {
    costs: await readJsonWithFallback<CostCatalogsFile>(
      resolve(catalogsDir, "costs.json"),
      resolve(catalogsDir, "costs.example.json")
    ),
    materials: await readJsonWithFallback<MaterialCatalogItem[]>(
      resolve(catalogsDir, "materials.json"),
      resolve(catalogsDir, "materials.example.json")
    ),
    products: await readJsonWithFallback<ProductCatalogItem[]>(
      resolve(catalogsDir, "products.json"),
      resolve(catalogsDir, "products.example.json")
    ),
    troqueles: await readJsonWithFallback<TroquelCatalogItem[]>(
      resolve(catalogsDir, "troqueles.json"),
      resolve(catalogsDir, "troqueles.example.json")
    ),
    machines: await readJsonWithFallback<MachineInventoryProcessItem[]>(
      resolve(catalogsDir, "machines.json"),
      resolve(catalogsDir, "machines.example.json")
    )
  };
}
