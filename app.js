// 1. Configuración de la conexión con Google Sheets
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwfKpUxfgQ9f8OdmHLdixrDZVI1DZTeQyA-GqS09dNss8a5yAvPtIYC2k_dVtp0hJQTg/exec';

let productos = [];
let carrito = [];

// Elementos del DOM
const productGrid = document.getElementById('product-grid');
const btnCart = document.getElementById('btn-cart');
const cartModal = document.getElementById('cart-modal');
const closeModal = document.getElementById('close-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartCountElement = document.getElementById('cart-count');
const checkoutForm = document.getElementById('checkout-form');
const addProductForm = document.getElementById('add-product-form');

// 2. Obtener productos en tiempo real desde Google Sheets
async function cargarProductosDesdeSheets() {
    productGrid.innerHTML = '<p>Cargando catálogo desde la Laptop Madre (Google Sheets)...</p>';
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        
        // Formatear datos numéricos
        productos = data.map(item => ({
            id: Number(item.id),
            nombre: String(item.nombre),
            precio: Number(item.precio),
            stock: Number(item.stock),
            imagen: String(item.imagen)
        }));

        renderProductos();
    } catch (error) {
        console.error('Error al conectar con Google Sheets:', error);
        productGrid.innerHTML = '<p>Error al cargar inventario. Revisa la URL de Apps Script.</p>';
    }
}

// 3. Cargar productos en la pantalla
function renderProductos() {
    productGrid.innerHTML = '';
    
    if (productos.length === 0) {
        productGrid.innerHTML = '<p>No hay productos registrados en el inventario.</p>';
        return;
    }

    productos.forEach(prod => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/150?text=Sin+Imagen'">
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

// 4. Agregar nuevo producto a Google Sheets (Laptop Madre)
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
    btnSubmit.textContent = 'Guardando...';

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto)
        });

        alert('¡Producto guardado exitosamente en Google Sheets!');
        addProductForm.reset();
        
        // Recargar inventario tras guardar
        setTimeout(() => {
            cargarProductosDesdeSheets();
            btnSubmit.disabled = false;
            btnSubmit.textContent = '➕ Guardar en Google Sheets';
        }, 1500);

    } catch (error) {
        alert('Hubo un problema al guardar el producto.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = '➕ Guardar en Google Sheets';
    }
});

// 5. Lógica del Carrito
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (producto && producto.stock > 0) {
        const itemEnCarrito = carrito.find(item => item.id === id);
        if (itemEnCarrito) {
            if (itemEnCarrito.cantidad < producto.stock) {
                itemEnCarrito.cantidad++;
            } else {
                alert("Sin más stock disponible.");
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

// 6. Confirmación de Pago y Actualización de Stock en Sheets
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

    // Actualizar el stock de cada producto en Google Sheets
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

    // Generar la factura en PDF
    generarFacturaPDF(cliente, email);

    alert(`¡Pago simulado con éxito!\nSe descontó el inventario en Google Sheets y se generó la factura para ${cliente}.`);

    carrito = [];
    actualizarCarritoUI();
    checkoutForm.reset();
    cartModal.classList.add('hidden');

    // Recargar inventario actualizado
    setTimeout(() => {
        cargarProductosDesdeSheets();
    }, 1500);
});

// 7. Generador de PDF de Factura
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

// Inicializar la carga de datos al abrir la página
cargarProductosDesdeSheets();