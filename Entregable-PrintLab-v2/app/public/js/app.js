// Aplicación Principal del Cotizador de Flexografía

class CotizadorFlexografia {
    constructor() {
        this.currentTab = 'cotizacion';
        this.clientes = [];
        this.productos = [];
        this.cotizaciones = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setDefaultDates();
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadClientes(),
                this.loadProductos(),
                this.loadCotizaciones()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showAlert('Error al cargar los datos iniciales', 'error');
        }
    }

    async loadClientes() {
        try {
            const response = await fetch('/api/clientes');
            const data = await response.json();
            this.clientes = data.clientes || [];
        } catch (error) {
            console.error('Error loading clientes:', error);
        }
    }

    async loadProductos() {
        try {
            const response = await fetch('/api/productos');
            const data = await response.json();
            this.productos = data.productos || [];
            this.populateProductoSelect();
        } catch (error) {
            console.error('Error loading productos:', error);
        }
    }

    async loadCotizaciones() {
        try {
            const response = await fetch('/api/cotizaciones');
            const data = await response.json();
            this.cotizaciones = data.cotizaciones || [];
        } catch (error) {
            console.error('Error loading cotizaciones:', error);
        }
    }

    populateProductoSelect() {
        const select = document.getElementById('producto-select');
        select.innerHTML = '<option value="">Seleccione un producto</option>';
        
        this.productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.nombre} - ${producto.tipo_impresion}`;
            option.dataset.precio = producto.precio_base;
            option.dataset.tipo = producto.tipo_impresion;
            option.dataset.material = producto.material;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('cotizacion-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarCotizacion();
        });

        // Auto-calculation on input changes
        const calcInputs = ['cantidad', 'medidas', 'colores'];
        calcInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.debounce(() => this.calcularCotizacion(), 500)());
            }
        });

        // Product selection change
        document.getElementById('producto-select').addEventListener('change', () => {
            this.onProductoChange();
        });

        // Type of printing change
        document.getElementById('tipo-impresion').addEventListener('change', () => {
            this.calcularCotizacion();
        });

        // Acabados change
        document.querySelectorAll('input[type="checkbox"][id^="acabado-"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calcularCotizacion());
        });
    }

    setupFormValidation() {
        const form = document.getElementById('cotizacion-form');
        const inputs = form.querySelectorAll('input[required], select[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        if (field.value.trim() === '') {
            this.showFieldError(field, 'Este campo es obligatorio');
            return false;
        }
        return true;
    }

    showFieldError(field, message) {
        field.classList.add('border-red-500');
        let errorDiv = field.parentNode.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message text-red-500 text-sm mt-1';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('border-red-500');
        const errorDiv = field.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    setDefaultDates() {
        const today = new Date();
        const entregaDate = new Date(today);
        entregaDate.setDate(today.getDate() + 7); // 7 días por defecto
        
        const vigenciaDate = new Date(today);
        vigenciaDate.setDate(today.getDate() + 15); // 15 días de vigencia por defecto

        document.getElementById('fecha-entrega').value = entregaDate.toISOString().split('T')[0];
        document.getElementById('vigencia').value = vigenciaDate.toISOString().split('T')[0];
    }

    onProductoChange() {
        const select = document.getElementById('producto-select');
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption.value) {
            const precioBase = parseFloat(selectedOption.dataset.precio) || 0;
            const tipoImpresion = selectedOption.dataset.tipo;
            const material = selectedOption.dataset.material;
            
            document.getElementById('tipo-impresion').value = tipoImpresion;
            document.getElementById('material').value = material || '';
        }
        
        this.calcularCotizacion();
    }

    calcularCotizacion() {
        try {
            const cantidad = parseInt(document.getElementById('cantidad').value) || 0;
            const tipoImpresion = document.getElementById('tipo-impresion').value;
            const colores = parseInt(document.getElementById('colores').value) || 1;
            const medidas = document.getElementById('medidas').value;
            
            if (cantidad <= 0 || !tipoImpresion) {
                this.limpiarCalculos();
                return;
            }

            // Obtener precio base del producto
            const productoSelect = document.getElementById('producto-select');
            const selectedOption = productoSelect.options[productoSelect.selectedIndex];
            let precioBase = parseFloat(selectedOption?.dataset.precio) || 0;

            // Si no hay producto seleccionado, usar precios base según tipo
            if (!precioBase) {
                precioBase = tipoImpresion === 'digital' ? 0.50 : 0.35;
            }

            // Calcular precio por colores
            const precioPorColores = precioBase * (1 + (colores - 1) * 0.15);

            // Calcular precio por medidas (si se especifican)
            let precioPorMedidas = precioPorColores;
            if (medidas && medidas.includes('x')) {
                const [ancho, alto] = medidas.split('x').map(m => parseFloat(m.trim()));
                if (!isNaN(ancho) && !isNaN(alto)) {
                    const area = (ancho * alto) / 100; // Convertir a dm²
                    precioPorMedidas = precioPorColores * Math.max(0.5, Math.min(3, area / 10));
                }
            }

            // Calcular costo por acabados
            let costoAcabados = 0;
            const acabados = [];
            if (document.getElementById('acabado-barniz').checked) {
                acabados.push('Barniz');
                costoAcabados += 0.10;
            }
            if (document.getElementById('acabado-laminado').checked) {
                acabados.push('Laminado');
                costoAcabados += 0.20;
            }
            if (document.getElementById('acabado-troquelado').checked) {
                acabados.push('Troquelado');
                costoAcabados += 0.15;
            }
            if (document.getElementById('acabado-pegado').checked) {
                acabados.push('Pegado');
                costoAcabados += 0.08;
            }
            if (document.getElementById('acabado-plegado').checked) {
                acabados.push('Plegado');
                costoAcabados += 0.05;
            }

            // Precio unitario final
            const precioUnitario = precioPorMedidas * (1 + costoAcabados);

            // Calcular totales
            const precioTotal = precioUnitario * cantidad;
            const iva = precioTotal * 0.12;
            const totalConIva = precioTotal + iva;

            // Actualizar campos
            document.getElementById('precio-unitario').value = precioUnitario.toFixed(4);
            document.getElementById('precio-total').value = precioTotal.toFixed(2);
            document.getElementById('iva').value = iva.toFixed(2);
            document.getElementById('total-con-iva').value = totalConIva.toFixed(2);

        } catch (error) {
            console.error('Error en cálculo:', error);
            this.showAlert('Error al calcular la cotización', 'error');
        }
    }

    limpiarCalculos() {
        document.getElementById('precio-unitario').value = '';
        document.getElementById('precio-total').value = '';
        document.getElementById('iva').value = '';
        document.getElementById('total-con-iva').value = '';
    }

    async guardarCotizacion() {
        try {
            // Validar formulario
            const form = document.getElementById('cotizacion-form');
            const requiredFields = form.querySelectorAll('input[required], select[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                this.showAlert('Por favor complete todos los campos obligatorios', 'warning');
                return;
            }

            // Recopilar datos del cliente
            const clienteData = {
                nombre: document.getElementById('cliente-nombre').value,
                nit: document.getElementById('cliente-nit').value,
                telefono: document.getElementById('cliente-telefono').value,
                email: document.getElementById('cliente-email').value,
                direccion: document.getElementById('cliente-direccion').value
            };

            // Primero guardar o actualizar el cliente
            let clienteId = await this.guardarCliente(clienteData);

            // Recopilar datos de la cotización
            const acabados = [];
            if (document.getElementById('acabado-barniz').checked) acabados.push('Barniz');
            if (document.getElementById('acabado-laminado').checked) acabados.push('Laminado');
            if (document.getElementById('acabado-troquelado').checked) acabados.push('Troquelado');
            if (document.getElementById('acabado-pegado').checked) acabados.push('Pegado');
            if (document.getElementById('acabado-plegado').checked) acabados.push('Plegado');

            const cotizacionData = {
                cliente_id: clienteId,
                producto_id: parseInt(document.getElementById('producto-select').value) || null,
                cantidad: parseInt(document.getElementById('cantidad').value),
                medidas: document.getElementById('medidas').value,
                colores: parseInt(document.getElementById('colores').value) || 1,
                acabados: acabados.join(', '),
                material: document.getElementById('material').value,
                precio_unitario: parseFloat(document.getElementById('precio-unitario').value),
                precio_total: parseFloat(document.getElementById('precio-total').value),
                iva: parseFloat(document.getElementById('iva').value),
                total_con_iva: parseFloat(document.getElementById('total-con-iva').value),
                fecha_entrega: document.getElementById('fecha-entrega').value,
                vigencia: document.getElementById('vigencia').value
            };

            const response = await fetch('/api/cotizaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cotizacionData)
            });

            if (!response.ok) {
                throw new Error('Error al guardar la cotización');
            }

            const result = await response.json();
            this.showAlert('Cotización guardada exitosamente', 'success');
            
            // Opcional: generar PDF automáticamente
            if (confirm('¿Desea generar el PDF de la cotización?')) {
                this.generarPDF(result.id);
            }

            // Resetear formulario
            form.reset();
            this.limpiarCalculos();
            this.setDefaultDates();

        } catch (error) {
            console.error('Error guardando cotización:', error);
            this.showAlert('Error al guardar la cotización', 'error');
        }
    }

    async guardarCliente(clienteData) {
        try {
            // Buscar si el cliente ya existe por nombre y NIT
            const clienteExistente = this.clientes.find(c => 
                c.nombre.toLowerCase() === clienteData.nombre.toLowerCase() && 
                c.nit === clienteData.nit
            );

            if (clienteExistente) {
                return clienteExistente.id;
            }

            // Crear nuevo cliente
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clienteData)
            });

            if (!response.ok) {
                throw new Error('Error al guardar el cliente');
            }

            const result = await response.json();
            await this.loadClientes(); // Recargar lista de clientes
            return result.id;

        } catch (error) {
            console.error('Error guardando cliente:', error);
            throw error;
        }
    }

    generarPDF(cotizacionId) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Configuración inicial
            doc.setFontSize(20);
            doc.text('COTIZACION FLEXOGRAFIA', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text('PrintLab', 105, 30, { align: 'center' });
            doc.text('Sistema de Cotización', 105, 37, { align: 'center' });

            // Datos del cliente
            doc.setFontSize(14);
            doc.text('Datos del Cliente:', 20, 55);
            doc.setFontSize(11);
            doc.text(`Nombre: ${document.getElementById('cliente-nombre').value}`, 20, 65);
            doc.text(`NIT: ${document.getElementById('cliente-nit').value || 'N/A'}`, 20, 72);
            doc.text(`Teléfono: ${document.getElementById('cliente-telefono').value || 'N/A'}`, 20, 79);
            doc.text(`Email: ${document.getElementById('cliente-email').value || 'N/A'}`, 20, 86);

            // Detalles del producto
            doc.setFontSize(14);
            doc.text('Detalles del Producto:', 20, 100);
            doc.setFontSize(11);
            doc.text(`Producto: ${document.getElementById('producto-select').options[document.getElementById('producto-select').selectedIndex].text}`, 20, 110);
            doc.text(`Tipo de Impresión: ${document.getElementById('tipo-impresion').value}`, 20, 117);
            doc.text(`Cantidad: ${document.getElementById('cantidad').value}`, 20, 124);
            doc.text(`Medidas: ${document.getElementById('medidas').value || 'N/A'}`, 20, 131);
            doc.text(`Colores: ${document.getElementById('colores').value || 1}`, 20, 138);
            doc.text(`Material: ${document.getElementById('material').value || 'N/A'}`, 20, 145);

            // Acabados
            const acabados = [];
            if (document.getElementById('acabado-barniz').checked) acabados.push('Barniz');
            if (document.getElementById('acabado-laminado').checked) acabados.push('Laminado');
            if (document.getElementById('acabado-troquelado').checked) acabados.push('Troquelado');
            if (document.getElementById('acabado-pegado').checked) acabados.push('Pegado');
            if (document.getElementById('acabado-plegado').checked) acabados.push('Plegado');
            
            if (acabados.length > 0) {
                doc.text(`Acabados: ${acabados.join(', ')}`, 20, 152);
            }

            // Totales
            doc.setFontSize(14);
            doc.text('Resumen de Costos:', 20, 170);
            doc.setFontSize(11);
            doc.text(`Precio Unitario: $${document.getElementById('precio-unitario').value}`, 20, 180);
            doc.text(`Precio Total: $${document.getElementById('precio-total').value}`, 20, 187);
            doc.text(`IVA (12%): $${document.getElementById('iva').value}`, 20, 194);
            doc.setFontSize(12);
            doc.text(`TOTAL CON IVA: $${document.getElementById('total-con-iva').value}`, 20, 205);

            // Fechas
            doc.setFontSize(11);
            doc.text(`Fecha de Entrega: ${document.getElementById('fecha-entrega').value}`, 20, 220);
            doc.text(`Vigencia: ${document.getElementById('vigencia').value}`, 20, 227);

            // Footer
            doc.setFontSize(9);
            doc.text('Esta cotización tiene validez únicamente durante el período especificado.', 105, 280, { align: 'center' });

            // Guardar PDF
            const fileName = `cotizacion_${Date.now()}.pdf`;
            doc.save(fileName);

            this.showAlert('PDF generado exitosamente', 'success');

        } catch (error) {
            console.error('Error generando PDF:', error);
            this.showAlert('Error al generar el PDF', 'error');
        }
    }

    showAlert(message, type = 'info') {
        // Crear elemento de alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} fixed top-4 right-4 z-50 max-w-sm`;
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Funciones globales para el HTML
let app;

function showTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remover clase activa de todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('text-gray-700', 'hover:bg-gray-100');
    });

    // Mostrar tab seleccionado
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');

    // Activar botón seleccionado
    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.add('bg-blue-500', 'text-white');
    activeBtn.classList.remove('text-gray-700', 'hover:bg-gray-100');

    // Cargar datos específicos del tab
    if (tabName === 'clientes') {
        app.loadClientesTable();
    } else if (tabName === 'productos') {
        app.loadProductosTable();
    } else if (tabName === 'historial') {
        app.loadHistorialTable();
    }
}

function calcularCotizacion() {
    app.calcularCotizacion();
}

function generarPDF() {
    app.generarPDF();
}

function showAddClienteModal() {
    // Implementar modal para agregar cliente
    console.log('Modal agregar cliente');
}

function showAddProductoModal() {
    // Implementar modal para agregar producto
    console.log('Modal agregar producto');
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app = new CotizadorFlexografia();
});

// Extensiones de la clase para manejo de tablas
CotizadorFlexografia.prototype.loadClientesTable = async function() {
    await this.loadClientes();
    const container = document.getElementById('clientes-list');
    
    if (this.clientes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay clientes registrados</p>';
        return;
    }

    let html = `
        <table class="table-custom">
            <thead>
                <tr>
                    <th class="px-4 py-3 text-left">Nombre</th>
                    <th class="px-4 py-3 text-left">NIT</th>
                    <th class="px-4 py-3 text-left">Teléfono</th>
                    <th class="px-4 py-3 text-left">Email</th>
                    <th class="px-4 py-3 text-left">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    this.clientes.forEach(cliente => {
        html += `
            <tr>
                <td class="px-4 py-3 border-b">${cliente.nombre}</td>
                <td class="px-4 py-3 border-b">${cliente.nit || 'N/A'}</td>
                <td class="px-4 py-3 border-b">${cliente.telefono || 'N/A'}</td>
                <td class="px-4 py-3 border-b">${cliente.email || 'N/A'}</td>
                <td class="px-4 py-3 border-b">
                    <button class="btn btn-primary text-sm px-3 py-1" onclick="app.editCliente(${cliente.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
};

CotizadorFlexografia.prototype.loadProductosTable = async function() {
    await this.loadProductos();
    const container = document.getElementById('productos-list');
    
    if (this.productos.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay productos registrados</p>';
        return;
    }

    let html = `
        <table class="table-custom">
            <thead>
                <tr>
                    <th class="px-4 py-3 text-left">Nombre</th>
                    <th class="px-4 py-3 text-left">Descripción</th>
                    <th class="px-4 py-3 text-left">Tipo</th>
                    <th class="px-4 py-3 text-left">Material</th>
                    <th class="px-4 py-3 text-left">Precio Base</th>
                    <th class="px-4 py-3 text-left">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    this.productos.forEach(producto => {
        html += `
            <tr>
                <td class="px-4 py-3 border-b">${producto.nombre}</td>
                <td class="px-4 py-3 border-b">${producto.descripcion || 'N/A'}</td>
                <td class="px-4 py-3 border-b">
                    <span class="badge ${producto.tipo_impresion === 'digital' ? 'badge-aprobada' : 'badge-pendiente'}">
                        ${producto.tipo_impresion}
                    </span>
                </td>
                <td class="px-4 py-3 border-b">${producto.material || 'N/A'}</td>
                <td class="px-4 py-3 border-b">$${producto.precio_base || '0.00'}</td>
                <td class="px-4 py-3 border-b">
                    <button class="btn btn-primary text-sm px-3 py-1" onclick="app.editProducto(${producto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
};

CotizadorFlexografia.prototype.loadHistorialTable = async function() {
    await this.loadCotizaciones();
    const container = document.getElementById('historial-list');
    
    if (this.cotizaciones.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay cotizaciones registradas</p>';
        return;
    }

    let html = `
        <table class="table-custom">
            <thead>
                <tr>
                    <th class="px-4 py-3 text-left">ID</th>
                    <th class="px-4 py-3 text-left">Cliente</th>
                    <th class="px-4 py-3 text-left">Producto</th>
                    <th class="px-4 py-3 text-left">Cantidad</th>
                    <th class="px-4 py-3 text-left">Total</th>
                    <th class="px-4 py-3 text-left">Estado</th>
                    <th class="px-4 py-3 text-left">Fecha</th>
                    <th class="px-4 py-3 text-left">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    this.cotizaciones.forEach(cotizacion => {
        const estadoClass = cotizacion.estado === 'aprobada' ? 'badge-aprobada' : 
                           cotizacion.estado === 'rechazada' ? 'badge-rechazada' : 'badge-pendiente';
        
        html += `
            <tr>
                <td class="px-4 py-3 border-b">#${cotizacion.id}</td>
                <td class="px-4 py-3 border-b">${cotizacion.cliente_nombre || 'N/A'}</td>
                <td class="px-4 py-3 border-b">${cotizacion.producto_nombre || 'N/A'}</td>
                <td class="px-4 py-3 border-b">${cotizacion.cantidad}</td>
                <td class="px-4 py-3 border-b">$${cotizacion.total_con_iva || '0.00'}</td>
                <td class="px-4 py-3 border-b">
                    <span class="badge ${estadoClass}">${cotizacion.estado || 'pendiente'}</span>
                </td>
                <td class="px-4 py-3 border-b">${new Date(cotizacion.creado_en).toLocaleDateString()}</td>
                <td class="px-4 py-3 border-b">
                    <button class="btn btn-primary text-sm px-3 py-1" onclick="app.verCotizacion(${cotizacion.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
};

CotizadorFlexografia.prototype.editCliente = function(id) {
    console.log('Editar cliente:', id);
    // Implementar edición de cliente
};

CotizadorFlexografia.prototype.editProducto = function(id) {
    console.log('Editar producto:', id);
    // Implementar edición de producto
};

CotizadorFlexografia.prototype.verCotizacion = function(id) {
    console.log('Ver cotización:', id);
    // Implementar vista detallada de cotización
};
