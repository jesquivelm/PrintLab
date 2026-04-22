# Repositories

Toda consulta nueva debe vivir aqui o en subdirectorios de este arbol.

Reglas base:

- no mezclar HTTP con SQL
- no usar `pgQuery(...)` directo desde rutas nuevas
- exponer funciones neutrales al motor
- mantener contratos estables para poder cambiar la implementacion por motor

Ejemplo conceptual:

```js
await adminUsersRepository.findById(id);
await adminUsersRepository.list(filters);
await adminUsersRepository.create(payload);
await adminUsersRepository.update(id, payload);
```
