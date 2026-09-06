// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN GLOBAL
// ==========================================
// Reemplaza la URL con la de tu ejecutable de Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwfKpUxfgQ9f8OdmHLdixrDZVI1DZTeQyA-GqS09dNss8a5yAvPtIYC2k_dVtp0hJQTg/exec';

let productos = [];
let carrito = [];

// Elementos del DOM
const productGrid = document.getElementById('product-grid');
const cartModal = document.getElementById('cart-modal');
const checkoutForm = document.getElementById('checkout-form');

// Elementos del Administrador
const adminAuthModal = document.getElementById('admin-auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const adminAuthForm = document.getElementById('admin-auth-form');
const adminPassInput = document.getElementById('admin-pass-input');
const btnAdminLogin = document.getElementById('btn-admin-login');
const adminPanel = document.getElementById('admin-panel');
const closeAdmin = document.getElementById('close-admin');
const addProductForm = document.getElementById('add-product-form');

// ==========================================
// 2. MODAL Y PANEL DE ADMINISTRACIÓN
// ==========================================
if (btnAdminLogin) {
    btnAdminLogin.addEventListener('click', () => {
        adminPassInput.value = '';
        adminAuthModal.classList.remove('hidden');
        adminPassInput.focus();
    });
}

if (closeAuthModal) {
    closeAuthModal.addEventListener('click', () => {
        adminAuthModal.classList.add('hidden');
    });
}

if (adminAuthForm) {
    adminAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Cambia 'admin123' por tu clave deseada
        if (adminPassInput.value === 'admin123') { 
            adminAuthModal.classList.add('hidden');
            adminPanel.classList.remove('hidden');
        } else {
            alert("Contraseña incorrecta. Acceso denegado.");
            adminPassInput.value = '';
            adminPassInput.focus();
        }
    });
}

if (closeAdmin) {
    closeAdmin.addEventListener('click', () => {
        adminPanel.classList.add('hidden');
    });
}

// Agregar nuevo producto a Google Sheets
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = addProductForm.querySelector('button[type="submit"]');
        const originalText = btnSubmit ? btnSubmit.innerText : 'Guardar';
        if (btnSubmit) {
            btnSubmit.innerText = 'Guardando en Google Sheets...';
            btnSubmit.disabled = true;
        }

        const nuevoProducto = {
            action: 'addProduct',
            nombre: document.getElementById('new-name').value,
            precio: parseFloat(document.getElementById('new-price').value),
            stock: parseInt(document.getElementById('new-stock').value),
            imagen: document.getElementById('new-image').value
        };

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProducto)
            });

            alert('Producto agregado con éxito a la base de datos.');
            addProductForm.reset();
            cargarProductosDesdeSheets();
        } catch (error) {
            alert('Error al conectar con Google Sheets.');
            console.error(error);
        } finally {
            if (btnSubmit) {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        }
    });
}

// ==========================================
// 3. CARGA DE PRODUCTOS Y RENDERIZADO
// ==========================================
async function cargarProductosDesdeSheets() {
    if (!productGrid) return;
    
    productGrid.innerHTML = '<p class="loading">Cargando catálogo de productos...</p>';

    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();

        productos = data.map(item => ({
            id: Number(item.id),
            nombre: String(item.nombre),
            precio: Number(item.precio),
            stock: Number(item.stock),
            imagen: String(item.imagen)
        }));

        renderProductos(productos);
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        productGrid.innerHTML = '<p class="error">Error al cargar el inventario desde Google Sheets.</p>';
    }
}

function renderProductos(items) {
    productGrid.innerHTML = '';
    
    if (items.length === 0) {
        productGrid.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
        return;
    }

    items.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/150'">
            <h3>${prod.nombre}</h3>
            <p class="price">$${prod.precio.toFixed(2)}</p>
            <p class="stock">Disponibles: ${prod.stock}</p>
            <button onclick="agregarAlCarrito(${prod.id})" ${prod.stock <= 0 ? 'disabled' : ''}>
                ${prod.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
            </button>
        `;
        productGrid.appendChild(card);
    });
}

// ==========================================
// 4. LÓGICA DEL CARRITO DE COMPRAS
// ==========================================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto || producto.stock <= 0) return;

    const itemEnCarrito = carrito.find(p => p.id === id);
    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.stock) {
            itemEnCarrito.cantidad++;
        } else {
            alert('Has alcanzado el límite de stock disponible.');
        }
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    // Si tienes función para actualizar el contador de ítems o lista del carrito visual, se ejecuta aquí
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCount.innerText = totalItems;
    }
}
// --- Eventos para abrir y cerrar Modales en Móvil y PC ---

// 1. Abrir Modal del Carrito
const cartBtn = document.getElementById('cart-icon') || document.querySelector('.cart-icon');
if (cartBtn) {
    cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        actualizarCarritoUI();
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.remove('hidden');
    });
}

// 2. Cerrar Modal del Carrito
const closeCartBtn = document.getElementById('close-cart');
if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.add('hidden');
    });
}

// 3. Abrir Modal de Administrador
const btnAdmin = document.getElementById('btn-admin-login');
if (btnAdmin) {
    btnAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        const adminPassInput = document.getElementById('admin-pass-input');
        if (adminPassInput) adminPassInput.value = '';
        const adminAuthModal = document.getElementById('admin-auth-modal');
        if (adminAuthModal) adminAuthModal.classList.remove('hidden');
    });
}
// ==========================================
// 5. CHECKOUT, DESCARGA PDF Y ENVÍO EMAILJS
// ==========================================
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cliente = document.getElementById('client-name').value;
        const email = document.getElementById('client-email').value;
        const tarjeta = document.getElementById('card-number').value;

        if (tarjeta.length < 16) {
            alert("Ingresa un número de tarjeta válido (16 dígitos).");
            return;
        }

        const btnPay = checkoutForm.querySelector('.btn-pay');
        const textoOriginal = btnPay ? btnPay.innerText : "Pagar";
        if (btnPay) {
            btnPay.innerText = "Procesando pago y enviando factura...";
            btnPay.disabled = true;
        }

        try {
            // 1. Actualizar stock en Google Sheets
            for (const item of carrito) {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updateStock',
                        id: item.id,
                        cantidad: item.cantidad
                    })
                });
            }

            // 2. Generar PDF
            generarFacturaPDF(cliente, email);

            // 3. Preparar variables para EmailJS
            let listaProductos = "";
            let totalFactura = 0;

            carrito.forEach(prod => {
                const subtotal = prod.precio * prod.cantidad;
                totalFactura += subtotal;
                listaProductos += `• ${prod.nombre} (x${prod.cantidad}): $${subtotal.toFixed(2)}\n`;
            });

            const params = {
                cliente_nombre: cliente,
                cliente_email: email,
                numero_factura: Math.floor(100000 + Math.random() * 900000),
                fecha: new Date().toLocaleDateString('es-SV'),
                total_pago: totalFactura.toFixed(2),
                detalles_compra: listaProductos
            };

            // 4. Enviar correo (coloca tus IDs de EmailJS)
            await emailjs.send("service_18duwxq", "template_dyts7h1", params);

            alert(`¡Pago simulado con éxito!\nFactura descargada y enviada a: ${email}`);

            carrito = [];
            actualizarCarritoUI();
            checkoutForm.reset();
            if (cartModal) cartModal.classList.add('hidden');

            setTimeout(() => {
                cargarProductosDesdeSheets();
            }, 1500);

        } catch (error) {
            alert("Ocurrió un error al procesar la compra o enviar el correo.");
            console.error("Error en checkout:", error);
        } finally {
            if (btnPay) {
                btnPay.innerText = textoOriginal;
                btnPay.disabled = false;
            }
        }
    });
}

// ==========================================
// 6. GENERADOR DE FACTURA EN PDF (jsPDF)
// ==========================================
function generarFacturaPDF(cliente, email) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("TechStore - Factura Digital de Compra", 14, 20);

    doc.setFontSize(11);
    doc.text(`Cliente: ${cliente}`, 14, 32);
    doc.text(`Correo electrónico: ${email}`, 14, 38);

    let y = 50;
    let total = 0;

    doc.text("Producto", 14, y);
    doc.text("Cant.", 120, y);
    doc.text("Precio", 150, y);
    doc.text("Subtotal", 180, y);
    y += 6;

    doc.line(14, y, 196, y);
    y += 8;

    carrito.forEach(prod => {
        const subtotal = prod.precio * prod.cantidad;
        total += subtotal;

        doc.text(prod.nombre, 14, y);
        doc.text(prod.cantidad.toString(), 120, y);
        doc.text(`$${prod.precio.toFixed(2)}`, 150, y);
        doc.text(`$${subtotal.toFixed(2)}`, 180, y);
        y += 8;
    });

    doc.line(14, y, 196, y);
    y += 10;

    doc.setFontSize(13);
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)}`, 130, y);

    doc.save(`Factura_TechStore_${Date.now()}.pdf`);
}

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================
cargarProductosDesdeSheets();