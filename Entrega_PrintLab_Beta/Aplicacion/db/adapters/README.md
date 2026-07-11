# Adapters de Base de Datos

Este directorio queda reservado para implementaciones por motor.

Objetivo:

- `postgres/` para la implementacion actual
- `sqlserver/` para una implementacion futura
- `oracle/` para una implementacion futura

La aplicacion no deberia depender directamente del driver (`pg`, `mssql`, `oracledb`) fuera de esta capa.
