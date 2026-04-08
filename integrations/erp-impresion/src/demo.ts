import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadCatalogsFromDataDir } from "./catalogs/file-system-catalog-loader.js";
import { MaterialCatalogItem } from "./catalogs/types.js";
import {
  FlexoRegularEntrada,
  calcularFlexoRegular
} from "./index.js";

async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

function mergeMaterialCosts(
  input: FlexoRegularEntrada,
  materials: MaterialCatalogItem[]
) {
  const material = materials.find((item) => item.id === input.materialId);

  if (!material) {
    throw new Error(
      `No se encontro el material '${input.materialId}' en data/catalogs/materials.json`
    );
  }

  return {
    materialDescripcion: input.materialDescripcion ?? material.descripcion,
    gramaje: material.gramaje ?? 0,
    costoMaterialPorMsi: material.costoMaterialPorMsi ?? 0,
    costoMaterialPorKg: material.costoMaterialPorKg ?? 0
  };
}

async function main() {
  const rootDir = resolve(process.cwd());
  const dataDir = resolve(rootDir, "data");
  const samplePath = resolve(dataDir, "samples", "flexo-regular-input.json");

  const catalogs = await loadCatalogsFromDataDir(dataDir);
  const input = await readJsonFile<FlexoRegularEntrada>(samplePath);
  const materialData = mergeMaterialCosts(input, catalogs.materials);

  const resultado = calcularFlexoRegular(input, {
    ...catalogs.costs.flexoRegular,
    ...materialData
  });

  console.log(JSON.stringify(resultado, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
