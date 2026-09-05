// 1. Configuración de conexión con Google Sheets
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwfKpUxfgQ9f8OdmHLdixrDZVI1DZTeQyA-GqS09dNss8a5yAvPtIYC2k_dVtp0hJQTg/exec';

let productos = [];
let carrito = [];

// Elementos DOM
const productGrid = document.getElementById('product-grid');
const btnCart = document.getElementById('btn-cart');
const cartModal = document.getElementById('cart-modal');
const closeModal = document.getElementById('close-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartCountElement = document.getElementById('cart-count');
const checkoutForm = document.getElementById('checkout-form');
const addProductForm = document.getElementById('add-product-form');

// Elementos Admin & Buscador
const btnAdminLogin = document.getElementById('btn-admin-login');
const adminPanel = document.getElementById('admin-panel');
const closeAdmin = document.getElementById('close-admin');
const searchInput = document.getElementById('search-input');

// 2. Control de Acceso al Panel de Laptop Madre
btnAdminLogin.addEventListener('click', () => {
// ✅ PEGA ESTE CÓDIGO EN SU LUGAR:
const adminAuthModal = document.getElementById('admin-auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const adminAuthForm = document.getElementById('admin-auth-form');
const adminPassInput = document.getElementById('admin-pass-input');

btnAdminLogin.addEventListener('click', () => {
    adminPassInput.value = '';
    adminAuthModal.classList.remove('hidden');
    adminPassInput.focus();
});

closeAuthModal.addEventListener('click', () => {
    adminAuthModal.classList.add('hidden');
});

adminAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = adminPassInput.value;

    if (password === "admin123") { // Puedes cambiar "admin123" por tu clave
        adminAuthModal.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        alert("Contraseña incorrecta. Acceso denegado.");
        adminPassInput.value = '';
        adminPassInput.focus();
    }
});
});

closeAdmin.addEventListener('click', () => adminPanel.classList.add('hidden'));

// 3. Cargar productos desde Google Sheets
async function cargarProductosDesdeSheets() {
    productGrid.innerHTML = '<p>Cargando catálogo de productos...</p>';
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
        console.error('Error:', error);
        productGrid.innerHTML = '<p>Error al cargar el inventario desde Google Sheets.</p>';
    }
}

// 4. Renderizar productos
function renderProductos(lista) {
    productGrid.innerHTML = '';
    
    if (lista.length === 0) {
        productGrid.innerHTML = '<p>No se encontraron productos.</p>';
        return;
    }

    lista.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/150?text=Producto'">
            <h3>${prod.nombre}</h3>
            <p class="price">$${prod.precio.toFixed(2)}</p>
            <p class="stock">Disponibles: <span>${prod.stock}</span></p>
            <button class="btn-add" onclick="agregarAlCarrito(${prod.id})" ${prod.stock <= 0 ? 'disabled' : ''}>
                ${prod.stock <= 0 ? 'Agotado' : 'Añadir al Carrito'}
            </button>
        `;
        productGrid.appendChild(card);
    });
}

// 5. Buscador en tiempo real
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(term));
    renderProductos(filtrados);
});

// 6. Agregar nuevo producto a Google Sheets
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoProducto = {
        action: 'add',
        nombre: document.getElementById('new-name').value,
        precio: parseFloat(document.getElementById('new-price').value),
        stock: parseInt(document.getElementById('new-stock').value),
        imagen: document.getElementById('new-image').value
    };

    const btnSubmit = addProductForm.querySelector('button');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando en Sheets...';

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto)
        });

        alert('¡Producto guardado exitosamente!');
        addProductForm.reset();
        
        setTimeout(() => {
            cargarProductosDesdeSheets();
            btnSubmit.disabled = false;
            btnSubmit.textContent = '➕ Guardar en Google Sheets';
        }, 1500);

    } catch (error) {
        alert('Error al guardar el producto.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = '➕ Guardar en Google Sheets';
    }
});

// 7. Lógica del Carrito
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (producto && producto.stock > 0) {
        const itemEnCarrito = carrito.find(item => item.id === id);
        if (itemEnCarrito) {
            if (itemEnCarrito.cantidad < producto.stock) {
                itemEnCarrito.cantidad++;
            } else {
                alert("Alcanzaste el límite de stock.");
                return;
            }
        } else {
            carrito.push({ ...producto, cantidad: 1 });
        }
        actualizarCarritoUI();
    }
}

function actualizarCarritoUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let totalCount = 0;

    carrito.forEach(item => {
        const itemTotal = item.precio * item.cantidad;
        total += itemTotal;
        totalCount += item.cantidad;

        const cartItem = document.createElement('div');
        cartItem.classList.add('cart-item');
        cartItem.innerHTML = `
            <div>
                <strong>${item.nombre}</strong><br>
                <small>$${item.precio.toFixed(2)} x ${item.cantidad}</small>
            </div>
            <div>
                <strong>$${itemTotal.toFixed(2)}</strong>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartTotalElement.textContent = total.toFixed(2);
    cartCountElement.textContent = totalCount;
}

btnCart.addEventListener('click', () => cartModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => cartModal.classList.add('hidden'));

// 8. Checkout y Facturación
// --- Evento Checkout: Actualizar Stock, Descargar PDF y Enviar Correo ---
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
        // 1. Actualizar el stock en Google Sheets
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

        // 2. Generar y descargar el PDF localmente
        generarFacturaPDF(cliente, email);

        // 3. Formatear la lista de productos para el correo de EmailJS
        let listaProductos = "";
        let totalFactura = 0;

        carrito.forEach(prod => {
            const subtotal = prod.precio * prod.cantidad;
            totalFactura += subtotal;
            listaProductos += `• ${prod.nombre} (x${prod.cantidad}): $${subtotal.toFixed(2)}\n`;
        });

        // 4. Parámetros para enviar por EmailJS
        const params = {
            cliente_nombre: cliente,
            cliente_email: email,
            numero_factura: Math.floor(100000 + Math.random() * 900000),
            fecha: new Date().toLocaleDateString('es-SV'),
            total_pago: totalFactura.toFixed(2),
            detalles_compra: listaProductos
        };

        // 5. Enviar correo usando EmailJS
        await emailjs.send("TU_SERVICE_ID", "TU_TEMPLATE_ID", params);

        alert(`¡Pago simulado con éxito!\nFactura descargada y enviada al correo: ${email}`);

        // Limpiar carrito y cerrar modal
        carrito = [];
        if (typeof actualizarCarritoUI === "function") {
            actualizarCarritoUI();
        }
        checkoutForm.reset();
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.add('hidden');

        setTimeout(() => {
            if (typeof cargarProductosDesdeSheets === "function") {
                cargarProductosDesdeSheets();
            }
        }, 1500);

    } catch (error) {
        alert("Ocurrió un error al procesar la transacción o enviar el correo.");
        console.error("Error en checkout:", error);
    } finally {
        if (btnPay) {
            btnPay.innerText = textoOriginal;
            btnPay.disabled = false;
        }
    }
});

// --- Generador de PDF ---
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