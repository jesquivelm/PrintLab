import { LoadedCatalogs } from "../catalogs/file-system-catalog-loader.js";
type DbCatalogsResult = {
    catalogs: LoadedCatalogs | null;
    source: "database" | "files";
};
export declare function loadCatalogsFromDatabase(): Promise<DbCatalogsResult>;
export {};
