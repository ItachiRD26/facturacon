# Respaldos y recuperación de la base de datos

Proyecto Google Cloud / Firebase: `sass-facturacion` · Base: Firestore `(default)` · Región: `nam5` (multirregión de EE. UU.)
Configurado el **2026-11-17**. Es lo que respalda el requisito de «respaldo y recuperación» de la DGII.

## Qué hay activo
| Protección | Detalle |
|---|---|
| **Recuperación a un punto en el tiempo (PITR)** | Se puede volver a cualquier minuto de los **últimos 7 días**. Sirve para errores humanos o borrados recientes |
| **Respaldo diario** | Una copia completa cada día, se guarda **7 días** |
| **Respaldo semanal** | Una copia cada domingo, se guarda **14 semanas** |
| **Protección contra borrado** | La base de datos no se puede eliminar por accidente (hay que desactivarla antes) |
| **Bitácora de auditoría con TTL** | Los registros de `auditoria` y `auditoria_sistema` se borran solos al pasar 24 meses (campo `expira`) |

Metas: **RPO** de 24 horas con los respaldos (mucho menos con PITR) y **RTO** de 4 horas.
Los certificados `.p12` están cifrados con Cloud KMS dentro de Firestore, así que quedan cubiertos por los mismos respaldos; el titular conserva siempre el original.

## Ver el estado
```
gcloud firestore databases describe --database="(default)" --project=sass-facturacion
gcloud firestore backups schedules list --database="(default)" --project=sass-facturacion
gcloud firestore backups list --project=sass-facturacion
```

## Cómo recuperar
Nunca se restaura encima de la base de producción: se restaura a una base **nueva**, se revisa y, si hace falta, se copian los datos o se cambia la aplicación a la nueva.

**A) Desde un respaldo (diario o semanal)**
```
gcloud firestore backups list --project=sass-facturacion
gcloud firestore databases restore --project=sass-facturacion \
  --source-backup=projects/sass-facturacion/locations/nam5/backups/ID_DEL_RESPALDO \
  --destination-database=restaurada-AAAAMMDD
```

**B) A un punto en el tiempo (últimos 7 días)**
```
gcloud firestore databases clone --project=sass-facturacion \
  --source-database=projects/sass-facturacion/databases/(default) \
  --snapshot-time=2026-11-17T15:00:00Z \
  --destination-database=clon-AAAAMMDD
```
(La hora va en UTC; República Dominicana es UTC-4. Si un comando cambia de nombre en versiones nuevas de gcloud, usar `gcloud firestore databases --help`.)

**Después de restaurar:** revisar secuencias fiscales y comprobantes enviados a la DGII (que no haya duplicados), avisar a los contribuyentes afectados y borrar la base temporal cuando ya no haga falta.

## Prueba de restauración (cada 6 meses)
1. Restaurar el respaldo más reciente a una base temporal (opción A).
2. Comprobar que existan empresas, comprobantes y secuencias.
3. Anotar fecha, quién lo hizo, cuánto tardó y el resultado.
4. Borrar la base temporal.

| Fecha | Tipo | Responsable | Resultado |
|---|---|---|---|
| 2026-11-18 (pendiente) | Primera prueba, cuando exista el primer respaldo diario | Peter | — |

## Costos
Los respaldos y el PITR cobran por almacenamiento según el tamaño de la base; con pocos datos es muy bajo. Si crece, revisar en la consola de Google Cloud (Facturación).

## Cómo apagarlo (solo si hiciera falta)
```
gcloud firestore databases update --database="(default)" --no-enable-pitr --no-delete-protection --project=sass-facturacion
gcloud firestore backups schedules delete ID --database="(default)" --project=sass-facturacion
```
