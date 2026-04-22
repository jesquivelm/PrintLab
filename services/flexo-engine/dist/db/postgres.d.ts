import { Pool } from "pg";
export type DatabaseHealth = {
    ok: boolean;
    database: string;
    host: string;
    port: number;
    schema: string;
    now?: string;
    tableCount?: number;
    tables?: string[];
    error?: string;
};
export declare function getPostgresPool(): Pool;
export declare function checkDatabaseHealth(): Promise<DatabaseHealth>;
