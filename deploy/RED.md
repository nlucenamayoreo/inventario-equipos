# Red de despliegue (AWS)

Decisión: el inventario se despliega en una **VPC existente compartida** (opción A), sin crear red propia,
para no pagar un NAT Gateway adicional. Validado en la cuenta `758837481569`, región `us-west-2` (Oregon).

| Elemento | Valor |
|---|---|
| VPC | `vpc-07cc5dc27cffa3a8e` (`dev-certificaciones-vpc`, `10.40.0.0/16`) |
| NAT Gateway | `nat-038d868d22e41b51c` |
| Subred privada A | `subnet-00d2e9dabe21468f6` — us-west-2a — `10.40.2.0/24` |
| Subred privada B | `subnet-07c0a6ffc35443279` — us-west-2b — `10.40.3.0/24` |
| Endpoints existentes | S3 y DynamoDB (gateway) |

Configuración para `aws-project-deployer` (`deploy/config.yaml`, ambiente único):

```yaml
create_network: false
existing_vpc_id: vpc-07cc5dc27cffa3a8e
existing_private_subnet_ids: [subnet-00d2e9dabe21468f6, subnet-07c0a6ffc35443279]
use_rds_proxy: false   # máximo ~10 usuarios, sin concurrencia
```

Aislamiento respecto de la otra aplicación de la VPC (`dev-certificaciones`): grupos de seguridad, base de datos
Aurora, roles IAM y Lambdas propios; etiquetas `Project`/`Environment`. Se comparte solo el NAT y el espacio de IP.

Condiciones acordadas:
- El responsable de `dev-certificaciones` debe saber que la VPC es compartida y no eliminarla ni cambiar sus rutas sin coordinar.
- Si la aplicación pasa a QA/PRD (Intelix), se mueve a la red de ese ambiente cambiando solo esta configuración.

## Recomendación para varios proyectos

- Segmentar por **ambiente** (producción separada de dev/qa) y por **sensibilidad de datos**, no por proyecto.
- Una VPC compartida no productiva y una de producción (idealmente en cuentas separadas con AWS Organizations).
- Cada proyecto se aísla con grupos de seguridad, base de datos, roles IAM y etiquetas propios (`create_network: false`).
- Plan de direccionamiento sin solapes (p. ej. `10.40.0.0/16` no productivo, `10.50.0.0/16` producción,
  `10.60.0.0/16` sandbox): el valor por defecto de la skill para dev también es `10.40.0.0/16`.
- Renombrar `dev-certificaciones-vpc` a un nombre de uso compartido (p. ej. `nonprod-shared-vpc`).
