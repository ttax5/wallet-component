# Wallet Component

Un componente web desarrollado con Svelte que conecta con la blockchain de Stellar para gestionar operaciones de wallet de forma segura y eficiente.

---

## 📚 Tabla de Contenidos

1. [¿Qué es una Blockchain?](#qué-es-una-blockchain)
2. [¿Qué es Stellar?](#qué-es-stellar)
3. [¿Qué es una Wallet?](#qué-es-una-wallet)
4. [¿Qué es SvelteKit?](#qué-es-sveltekit)
5. [Primeros Pasos](#primeros-pasos)
6. [Creación de Claves (Public Key y Private Key)](#creación-de-claves-public-key-y-private-key)
7. [Conectarse a Stellar](#conectarse-a-stellar)
8. [Desarrollo Local](#desarrollo-local)

---

## 🔗 ¿Qué es una Blockchain?

Una **blockchain** (cadena de bloques) es una tecnología de registro distribuido que almacena información de manera segura, transparente e inmutable. 

### Características principales:

- **Descentralizada**: No depende de una autoridad central
- **Inmutable**: Una vez registrados, los datos no pueden ser alterados
- **Transparente**: Todas las transacciones son visibles públicamente
- **Segura**: Utiliza criptografía avanzada para proteger la información

### ¿Cómo funciona?

1. Las transacciones se agrupan en bloques
2. Cada bloque se enlaza criptográficamente al anterior
3. Los nodos de la red validan y confirman las transacciones
4. Una vez validado, el bloque se añade permanentemente a la cadena

---

## ⭐ ¿Qué es Stellar?

**Stellar** es una red blockchain de código abierto diseñada para facilitar transacciones financieras rápidas, económicas y seguras a nivel global.

### Características de Stellar:

- **Transacciones rápidas**: Confirmaciones en 3-5 segundos
- **Bajo costo**: Tarifas mínimas (fracciones de centavo)
- **Multi-moneda**: Soporta cualquier tipo de activo digital
- **Anclas**: Permite conectar con sistemas financieros tradicionales
- **DEX integrado**: Exchange descentralizado incorporado

### Token nativo: Lumens (XLM)

Los **Lumens** son la criptomoneda nativa de Stellar, utilizada para:
- Pagar tarifas de transacción
- Mantener cuentas activas (reserva mínima)
- Prevenir spam en la red

### Casos de uso:

- Pagos transfronterizos
- Remesas internacionales
- Tokenización de activos
- Micropagos
- Sistemas de pago punto de venta

📖 **Más información**: [Documentación oficial de Stellar](https://developers.stellar.org/docs/)

---

## 👛 ¿Qué es una Wallet?

Una **wallet** (billetera) es una aplicación que permite almacenar, enviar y recibir criptomonedas de forma segura. No almacena realmente las monedas, sino las **claves** que te dan acceso a tus fondos en la blockchain.

### Tipos de wallets:

1. **Hot Wallets** (Calientes)
   - Conectadas a internet
   - Más convenientes para uso diario
   - Ejemplo: Wallets web, móviles, extensiones de navegador

2. **Cold Wallets** (Frías)
   - Sin conexión a internet
   - Máxima seguridad para almacenamiento a largo plazo
   - Ejemplo: Hardware wallets, paper wallets

### Componentes de una wallet:

- **Public Key (Clave Pública)**: Dirección que compartes para recibir fondos
  - Ejemplo en Stellar: `GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
  
- **Private Key (Clave Privada)**: Clave secreta que nunca debes compartir
  - Da acceso completo a tus fondos
  - Ejemplo: `SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

⚠️ **IMPORTANTE**: Nunca compartas tu clave privada. Quien la tenga controla tus fondos.

---

## 🚀 ¿Qué es SvelteKit?

**SvelteKit** es un framework moderno para construir aplicaciones web de alto rendimiento basado en Svelte.

### ¿Por qué SvelteKit?

- **Svelte**: Framework reactivo que compila a JavaScript vanilla
- **Performance**: Sin Virtual DOM, código más rápido y ligero
- **DX (Developer Experience)**: Sintaxis simple e intuitiva
- **SSR/SSG**: Renderizado del lado del servidor y generación estática
- **File-based routing**: Rutas basadas en estructura de carpetas
- **TypeScript**: Soporte nativo para TypeScript

### Ventajas para este proyecto:

- Componentes reactivos perfectos para interfaces de wallet
- Bundle pequeño para carga rápida
- Fácil integración con APIs blockchain
- Excelente para Progressive Web Apps (PWA)

📖 **Más información**: [Documentación de SvelteKit](https://kit.svelte.dev/)

---

## 🎯 Primeros Pasos

### Requisitos previos:

- **Node.js** (versión 18 o superior)
- **pnpm** instalado globalmente: `npm install -g pnpm`
- Editor de código (recomendado: VS Code)
- Conocimientos básicos de JavaScript/TypeScript

### Instalación:

```bash
# 1. Clonar el repositorio
git clone git@github.com:paxapos/wallet-component.git

# 2. Entrar al directorio del proyecto
cd wallet-component

# 3. Instalar dependencias
pnpm install

# 4. Instalar dependencias adicionales de WalletConnect
pnpm add @reown/walletkit @walletconnect/utils @walletconnect/core

# 5. Iniciar servidor de desarrollo
pnpm run dev
```

### Verificar instalación:

Una vez iniciado el servidor, abre tu navegador en:
```
http://localhost:5173/
```

Deberías ver la interfaz de la wallet funcionando correctamente.

---

## 🔐 Creación de Claves (Public Key y Private Key)

### Opción 1: Crear claves mediante código

Este proyecto incluye funciones para generar pares de claves de Stellar:

```typescript
import { Keypair } from '@stellar/stellar-sdk';

// Generar un nuevo par de claves
const keypair = Keypair.random();

// Obtener la clave pública (dirección de la cuenta)
const publicKey = keypair.publicKey();
console.log('Public Key:', publicKey);
// Ejemplo: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// Obtener la clave privada (¡MANTENER SECRETA!)
const privateKey = keypair.secret();
console.log('Private Key:', privateKey);
// Ejemplo: SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Opción 2: Usar Stellar Laboratory

1. Visita [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Ve a la sección "Generate keypair"
3. Haz clic en "Generate keypair"
4. Guarda ambas claves en un lugar seguro

### Opción 3: Usar el SDK de Stellar

```typescript
// Ejemplo práctico en el proyecto
import { StellarAccount } from './src/stellar_account';

// Crear nueva cuenta
const account = new StellarAccount();
await account.createAccount();

// Las claves se generan y almacenan automáticamente
console.log('Cuenta creada:', account.publicKey);
```

### 🛡️ Seguridad de claves:

**DO (Hacer):**
- ✅ Guarda tu clave privada en un gestor de contraseñas
- ✅ Haz backups cifrados de tus claves
- ✅ Usa variables de entorno para claves en desarrollo
- ✅ Implementa encriptación para almacenar claves

**DON'T (No hacer):**
- ❌ Nunca compartas tu clave privada
- ❌ No la guardes en texto plano
- ❌ No la subas a repositorios (usa .env y .gitignore)
- ❌ No la envíes por correo o mensajería

### Variables de entorno:

Crea un archivo `.env` en la raíz del proyecto:

```env
# .env (NO SUBIR A GIT)
VITE_STELLAR_PUBLIC_KEY=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_STELLAR_PRIVATE_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_STELLAR_NETWORK=testnet  # o 'mainnet'
```

Asegúrate de que `.env` esté en tu `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

---

## 🌐 Conectarse a Stellar

### Redes disponibles:

Stellar ofrece dos redes principales:

1. **Testnet** (Red de Pruebas)
   - Para desarrollo y testing
   - Lumens gratis desde el Friendbot
   - Sin valor real
   - Horizon API: `https://horizon-testnet.stellar.org`

2. **Mainnet** (Red Principal)
   - Red de producción con valor real
   - Requiere XLM reales
   - Horizon API: `https://horizon.stellar.org`

### Paso 1: Configurar la red

```typescript
import { Networks, Horizon } from '@stellar/stellar-sdk';

// Para Testnet
const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

// Para Mainnet (producción)
// const server = new Horizon.Server('https://horizon.stellar.org');
// const networkPassphrase = Networks.PUBLIC;
```

### Paso 2: Financiar cuenta en Testnet

Para poder usar una cuenta en Testnet, necesita fondos iniciales:

```typescript
import { Keypair } from '@stellar/stellar-sdk';

async function financiarCuentaTestnet(publicKey: string) {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${publicKey}`
    );
    const result = await response.json();
    console.log('Cuenta financiada:', result);
  } catch (error) {
    console.error('Error al financiar cuenta:', error);
  }
}

// Usar
const keypair = Keypair.random();
await financiarCuentaTestnet(keypair.publicKey());
```

### Paso 3: Consultar balance de cuenta

```typescript
async function consultarBalance(publicKey: string) {
  try {
    const account = await server.loadAccount(publicKey);
    
    console.log('Balances de la cuenta:');
    account.balances.forEach((balance) => {
      if (balance.asset_type === 'native') {
        console.log(`XLM: ${balance.balance}`);
      } else {
        console.log(
          `${balance.asset_code}: ${balance.balance} (Emisor: ${balance.asset_issuer})`
        );
      }
    });
  } catch (error) {
    console.error('Error al consultar balance:', error);
  }
}
```

### Paso 4: Enviar una transacción

```typescript
import { 
  Keypair, 
  TransactionBuilder, 
  Operation,
  Asset,
  BASE_FEE
} from '@stellar/stellar-sdk';

async function enviarPago(
  origenSecret: string,
  destinoPublicKey: string,
  cantidad: string
) {
  try {
    // Cargar cuenta origen
    const origenKeypair = Keypair.fromSecret(origenSecret);
    const origenAccount = await server.loadAccount(origenKeypair.publicKey());

    // Construir transacción
    const transaction = new TransactionBuilder(origenAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: destinoPublicKey,
          asset: Asset.native(), // XLM
          amount: cantidad
        })
      )
      .setTimeout(30)
      .build();

    // Firmar transacción
    transaction.sign(origenKeypair);

    // Enviar transacción
    const result = await server.submitTransaction(transaction);
    console.log('Transacción exitosa:', result);
    
    return result;
  } catch (error) {
    console.error('Error en transacción:', error);
    throw error;
  }
}

// Ejemplo de uso
await enviarPago(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Tu clave privada
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Destino
  '10.5' // Cantidad en XLM
);
```

### Paso 5: Monitorear transacciones

```typescript
// Escuchar pagos recibidos
server
  .payments()
  .forAccount(publicKey)
  .cursor('now')
  .stream({
    onmessage: (payment) => {
      console.log('Pago recibido:', payment);
    },
    onerror: (error) => {
      console.error('Error en stream:', error);
    }
  });
```

---

## 💻 Desarrollo Local

### Estructura del proyecto:

```
wallet-component/
├── src/
│   ├── lib/                 # Componentes Svelte reutilizables
│   │   ├── Wallet.svelte
│   │   ├── WalletQR.svelte
│   │   └── WalletSaldoHistory.svelte
│   ├── service/             # Servicios de blockchain
│   │   └── blockchains/
│   │       ├── stellar.ts   # Lógica de Stellar
│   │       └── bitcoin.ts
│   ├── stellar_account.ts   # Gestión de cuentas Stellar
│   ├── App.svelte           # Componente principal
│   └── main.ts              # Punto de entrada
├── public/                  # Archivos estáticos
├── package.json
├── vite.config.ts          # Configuración de Vite
├── svelte.config.js        # Configuración de Svelte
└── tsconfig.json           # Configuración de TypeScript
```

### Scripts disponibles:

```bash
# Desarrollo con hot-reload
pnpm run dev

# Construir para producción
pnpm run build

# Preview de producción
pnpm run preview

# Linter
pnpm run lint

# Formatear código
pnpm run format
```

### Testing con Testnet:

1. Usa siempre Testnet para desarrollo
2. Obtén XLM gratis desde Friendbot
3. Documenta tus transacciones de prueba
4. No uses claves de producción en desarrollo

### Recursos útiles:

- 📖 [Stellar Docs](https://developers.stellar.org/docs/)
- 🧪 [Stellar Laboratory](https://laboratory.stellar.org/)
- 🔍 [Stellar Expert Explorer](https://stellar.expert/)
- 💬 [Stellar Stack Exchange](https://stellar.stackexchange.com/)
- 🐦 [Stellar Discord](https://discord.gg/stellardev)

---

## 📝 Próximos pasos

Una vez tengas el proyecto corriendo:

1. Explora los componentes en `src/lib/`
2. Revisa la implementación de `stellar_account.ts`
3. Crea una cuenta de prueba en Testnet
4. Experimenta con transacciones de prueba
5. Personaliza los componentes según tus necesidades

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.

---

## ⚠️ Disclaimer

Este software se proporciona "tal cual" sin garantías. Úsalo bajo tu propio riesgo. Siempre verifica las transacciones antes de enviarlas en Mainnet.


