Foto Aneuris - Sistema de Gestión y Facturación
Este es un sistema de gestión de inventario y punto de venta integral, diseñado específicamente para optimizar las operaciones de la tienda de fotografía Foto Aneuris. La aplicación está construida como un Single Page Application (SPA) utilizando React y se apoya en Firebase Firestore para una base de datos en tiempo real, garantizando la persistencia y la sincronización de datos.

Funcionalidades Detalladas
Módulo de Autenticación y Roles de Usuario
La seguridad y el acceso son gestionados por un sistema de autenticación robusto con roles definidos:

Administrador: Acceso completo a todas las funciones, incluyendo gestión de empleados, inventario, reportes financieros y configuración global.

Vendedor (Empleado): Acceso restringido al punto de venta y su historial de transacciones, sin la posibilidad de alterar precios, stock o configuraciones del sistema.

Módulo de Punto de Venta (PDV)
Una interfaz optimizada para agilizar el proceso de venta:

Búsqueda Rápida: Los productos pueden ser encontrados instantáneamente por nombre, categoría o escaneando un código de barras.

Gestión del Carrito: Permite a los vendedores añadir, ajustar cantidades o eliminar productos del carrito de forma sencilla.

Descuentos y Totales: Aplica automáticamente un descuento global preestablecido por el administrador y muestra el total de la venta, la ganancia neta y el nombre del vendedor en el recibo.

Módulo de Inventario y Productos
Control total sobre los activos de la tienda:

Entrada de Productos: Un formulario dedicado para registrar nuevos productos con detalles como nombre, precio de venta, costo, stock, código de barras y categoría.

Inventario General: Una vista completa donde el administrador puede monitorear el stock en tiempo real, editar precios y costos, y recibir alertas visuales de productos con stock bajo.

Ajuste de Precios en Lote: Una herramienta para aplicar aumentos o descuentos masivos a los precios de los productos, ya sea por porcentaje o por una cantidad fija.

Módulo de Reportes y Análisis
Herramientas avanzadas para una toma de decisiones informada:

Análisis Financiero: Presenta un resumen claro de los ingresos, costos y ganancias netas de la tienda en un rango de fechas seleccionado.

Ventas por Vendedor: Un gráfico de barras que visualiza el rendimiento de cada empleado, mostrando el total de ventas generadas.

Productos Populares: Un reporte gráfico que identifica los productos más vendidos, ayudando a optimizar el inventario.

Resumen Diario de Ventas: Muestra un historial detallado de las transacciones diarias, permitiendo una trazabilidad completa.

Estructura del Proyecto
El proyecto está organizado con una estructura estándar de React:

mi-aplicacion-foto-aneuris/
├── public/
│   ├── index.html
└── src/
    ├── App.jsx
    └── index.js
├── netlify.toml
└── package.json

public/index.html: Es la página HTML principal que carga la aplicación de React.

src/index.js: El punto de entrada principal del código de React.

src/App.jsx: El componente principal que contiene toda la lógica de la aplicación.

netlify.toml: Archivo de configuración que instruye a Netlify a manejar las redirecciones de la aplicación.

package.json: Archivo de manifiesto que gestiona las dependencias y scripts del proyecto.

Guía de Despliegue en Netlify
Asegúrese de que todos los archivos, incluyendo netlify.toml, estén en la raíz de su repositorio de GitHub.

Conecte su repositorio de GitHub a Netlify a través de su panel de control.

Netlify detectará automáticamente el archivo package.json y netlify.toml para construir y desplegar la aplicación correctamente.

Credenciales de Acceso
Para Administradores
Usuario: admin

Contraseña: lider1234

Para Empleados
Los empleados deben ser registrados por un administrador en la sección "Gestión de Empleados" para obtener un usuario y contraseña.
