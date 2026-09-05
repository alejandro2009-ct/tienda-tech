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
    const password = prompt("Ingresa la contraseña de la Laptop Madre para administrar:");
    if (password === "admin123") { // Contraseña de administración
        adminPanel.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (password !== null) {
        alert("Contraseña incorrecta. Acceso denegado.");
    }
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
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const cliente = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;
    const tarjeta = document.getElementById('card-number').value;

    if (tarjeta.length < 16) {
        alert("Ingresa un número de tarjeta válido (16 dígitos).");
        return;
    }

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

    generarFacturaPDF(cliente, email);

    alert(`¡Pago simulado con éxito!\nFactura generada para ${cliente}.`);

    carrito = [];
    actualizarCarritoUI();
    checkoutForm.reset();
    cartModal.classList.add('hidden');

    setTimeout(() => {
        cargarProductosDesdeSheets();
    }, 1500);
});

// 9. Generador de PDF
function generarFacturaPDF(cliente, email) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("TechStore - Factura Digital de Compra", 14, 20);

    doc.setFontSize(11);
    doc.text(`Cliente: ${cliente}`, 14, 32);
    doc.text(`Correo electrónico: ${email}`, 14, 38);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 44);

    doc.text("----------------------------------------------------------------------------------", 14, 50);

    let y = 60;
    doc.setFontSize(12);
    doc.text("Producto", 14, y);
    doc.text("Cant.", 120, y);
    doc.text("Precio Unit.", 145, y);
    doc.text("Subtotal", 175, y);

    y += 6;
    doc.setFontSize(10);

    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        doc.text(item.nombre.substring(0, 35), 14, y);
        doc.text(item.cantidad.toString(), 125, y);
        doc.text(`$${item.precio.toFixed(2)}`, 145, y);
        doc.text(`$${subtotal.toFixed(2)}`, 175, y);
        y += 8;
    });

    doc.text("----------------------------------------------------------------------------------", 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)}`, 130, y);

    doc.save(`Factura_TechStore_${Date.now()}.pdf`);
}

// Inicializar
cargarProductosDesdeSheets();