import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
async function readJsonFile(path) {
    const content = await readFile(path, "utf8");
    return JSON.parse(content);
}
async function readJsonWithFallback(primaryPath, fallbackPath) {
    try {
        await access(primaryPath);
        return await readJsonFile(primaryPath);
    }
    catch {
        return await readJsonFile(fallbackPath);
    }
}
export async function loadCatalogsFromDataDir(dataDir) {
    const catalogsDir = resolve(dataDir, "catalogs");
    return {
        costs: await readJsonWithFallback(resolve(catalogsDir, "costs.json"), resolve(catalogsDir, "costs.example.json")),
        materials: await readJsonWithFallback(resolve(catalogsDir, "materials.json"), resolve(catalogsDir, "materials.example.json")),
        products: await readJsonWithFallback(resolve(catalogsDir, "products.json"), resolve(catalogsDir, "products.example.json")),
        troqueles: await readJsonWithFallback(resolve(catalogsDir, "troqueles.json"), resolve(catalogsDir, "troqueles.example.json")),
        machines: await readJsonWithFallback(resolve(catalogsDir, "machines.json"), resolve(catalogsDir, "machines.example.json"))
    };
}
