import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, setLogLevel, getDoc, setDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Habilitar logging de Firebase para depuración
setLogLevel('debug');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCly9Ju7IzXwC6qOqzKMmbAErqfu8Kp1Jo",
  authDomain: "sistema-de-foto-aneuris.firebaseapp.com",
  projectId: "sistema-de-foto-aneuris",
  storageBucket: "sistema-de-foto-aneuris.firebasestorage.app",
  messagingSenderId: "193588291061",
  appId: "1:193588291061:web:3215380562fb724ac06cbc"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = firebaseConfig.projectId;


const App = () => {
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentView, setCurrentView] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost: 0, stock: 0, barcode: '', category: '' });
  const [newEmployee, setNewEmployee] = useState({ name: '', username: '', password: '' });
  const [newReturn, setNewReturn] = useState({ productId: '', quantity: 1 });
  const [modal, setModal] = useState({ visible: false, message: '', isError: false, onConfirm: null });
  const [productQuantities, setProductQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [salesHistory, setSalesHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [filterDates, setFilterDates] = useState({ start: '', end: '' });
  const [batchUpdate, setBatchUpdate] = useState({ type: 'percentage', value: 0 });
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Función para mostrar un modal personalizado
  const showModal = (message, isError = false, onConfirm = null) => {
    setModal({ visible: true, message, isError, onConfirm });
  };

  // Función para imprimir el recibo
  const printReceipt = () => {
    const receiptWindow = window.open('', 'Print-Window');
    const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const discountedTotal = totalAmount * (1 - globalDiscount / 100);

    const receiptContent = `
      <div class="p-8 font-mono max-w-sm mx-auto">
        <h1 class="text-center font-bold text-lg mb-2">Foto Aneuris</h1>
        <p class="text-center text-sm mb-4">Recibo de Venta</p>
        <hr class="border-t border-dashed border-gray-400 my-2">
        <div class="text-xs mb-4">
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
          <p>Hora: ${new Date().toLocaleTimeString('es-ES')}</p>
          <p>Vendedor: ${userName}</p>
        </div>
        <hr class="border-t border-dashed border-gray-400 my-2">
        <table class="w-full text-xs mb-4">
          <thead>
            <tr>
              <th class="text-left">Producto</th>
              <th class="text-right">Cant.</th>
              <th class="text-right">Precio</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cart.map(item => `
              <tr>
                <td class="text-left">${item.name}<br/><span class="text-gray-500 text-xs">(${item.category})</span></td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.price)}</td>
                <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <hr class="border-t border-dashed border-gray-400 my-2">
        <div class="text-right text-lg font-bold mb-2">
          Subtotal: ${formatCurrency(totalAmount)}
        </div>
        <div class="text-right text-lg font-bold mb-2">
          Descuento: ${globalDiscount}%
        </div>
        <div class="text-right text-lg font-bold mb-4">
          Total: ${formatCurrency(discountedTotal)}
        </div>
        <p class="text-center text-xs mt-6">¡Gracias por su compra!</p>
      </div>
    `;

    receiptWindow.document.open();
    receiptWindow.document.write(`
      <html>
      <head>
        <title>Recibo de Venta</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
          body { font-family: 'Roboto Mono', monospace; }
        </style>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>${receiptContent}</body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  useEffect(() => {
    // A fixed user ID for data isolation in this environment
    setUserId("foto-aneuris-admin"); 
  }, []);
  
  useEffect(() => {
    if (userId && userRole) {
      const inventarioPath = `/artifacts/${appId}/users/${userId}/inventario`;
      const inventarioCol = collection(db, inventarioPath);
      
      const unsubscribe = onSnapshot(inventarioCol, (snapshot) => {
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productList);
        const initialQuantities = {};
        productList.forEach(product => {
          initialQuantities[product.id] = 1;
        });
        setProductQuantities(initialQuantities);
        setLowStockProducts(productList.filter(p => p.stock <= 5));
      }, (error) => {
        showModal("Error al cargar inventario: " + error.message, true);
        console.error("Error fetching inventory: ", error);
      });
      
      return () => unsubscribe();
    }
  }, [db, userId, userRole]);

  useEffect(() => {
    if (userId) {
      const salesPath = `/artifacts/${appId}/public/data/ventas`;
      const salesCol = collection(db, salesPath);

      const unsubscribe = onSnapshot(salesCol, (snapshot) => {
        const salesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSalesHistory(salesList);
      }, (error) => {
        showModal("Error al cargar el historial de ventas: " + error.message, true);
        console.error("Error fetching sales history: ", error);
      });

      return () => unsubscribe();
    }
  }, [db, userId]);

  useEffect(() => {
    if (userId && userRole === 'admin') {
      const employeesPath = `/artifacts/${appId}/public/data/employees`;
      const employeesCol = collection(db, employeesPath);

      const unsubscribe = onSnapshot(employeesCol, (snapshot) => {
        const employeeList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeeList);
      }, (error) => {
        showModal("Error al cargar la lista de empleados: " + error.message, true);
        console.error("Error fetching employees: ", error);
      });

      return () => unsubscribe();
    }
  }, [db, userId, userRole]);

  // Efecto para obtener las categorías y el descuento global
  useEffect(() => {
    if (userId) {
      const categoriesRef = collection(db, `/artifacts/${appId}/users/${userId}/categories`);
      const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
        const categoriesList = snapshot.docs.map(doc => doc.data().name);
        setCategories(categoriesList);
      }, (error) => {
        console.error("Error fetching categories: ", error);
      });

      const discountRef = doc(db, `/artifacts/${appId}/users/${userId}/settings/discounts`);
      const unsubscribeDiscount = onSnapshot(discountRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setGlobalDiscount(docSnapshot.data().globalDiscount || 0);
        } else {
          setGlobalDiscount(0);
        }
      }, (error) => {
        console.error("Error fetching global discount: ", error);
      });

      return () => {
        unsubscribeCategories();
        unsubscribeDiscount();
      };
    }
  }, [db, userId]);


  const handleLogin = async (e) => {
    e.preventDefault();

    if (loginForm.username === 'admin' && loginForm.password === 'lider1234') {
      setUserRole('admin');
      setUserName('admin');
      setCurrentView('punto_de_venta');
    } else {
      try {
        const employeesRef = collection(db, `/artifacts/${appId}/public/data/employees`);
        const querySnapshot = await getDocs(employeesRef);
        const employeeData = querySnapshot.docs.find(
          doc => doc.data().username === loginForm.username && doc.data().password === loginForm.password
        );

        if (employeeData) {
          setUserRole(employeeData.data().role || 'employee');
          setUserName(employeeData.data().name);
          setCurrentView('punto_de_venta');
        } else {
          showModal('Credenciales incorrectas.', true);
        }
      } catch (error) {
        showModal('Error al iniciar sesión: ' + error.message, true);
        console.error("Error during employee login: ", error);
      }
    }
  };
  
  const handleLogout = () => {
    setUserRole(null);
    setUserName('');
    setCart([]);
    setLoginForm({ username: '', password: '' });
    setCurrentView('login');
  };

  const addProductToInventory = async () => {
    if (!newProduct.name || newProduct.price <= 0 || newProduct.cost <= 0 || newProduct.stock <= 0 || !newProduct.category) {
      showModal('Por favor, complete todos los campos correctamente.', true);
      return;
    }
    try {
      await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/inventario`), {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        cost: parseFloat(newProduct.cost),
        stock: parseInt(newProduct.stock),
        barcode: newProduct.barcode,
        category: newProduct.category
      });
      showModal('Producto agregado con éxito.');
      setNewProduct({ name: '', price: 0, cost: 0, stock: 0, barcode: '', category: '' });
    } catch (error) {
      showModal('Error al agregar el producto: ' + error.message, true);
      console.error("Error adding product: ", error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      showModal('Por favor, ingrese un nombre para la categoría.', true);
      return;
    }
    try {
      const categoriesRef = collection(db, `/artifacts/${appId}/users/${userId}/categories`);
      const existingCategory = await getDocs(categoriesRef);
      const categoryExists = existingCategory.docs.some(doc => doc.data().name.toLowerCase() === newCategory.trim().toLowerCase());

      if (categoryExists) {
        showModal('La categoría ya existe.', true);
        return;
      }
      await addDoc(categoriesRef, { name: newCategory.trim() });
      showModal('Categoría agregada con éxito.');
      setNewCategory('');
    } catch (error) {
      showModal('Error al agregar la categoría: ' + error.message, true);
      console.error("Error adding category: ", error);
    }
  };

  const registerEmployee = async () => {
    if (!newEmployee.name || !newEmployee.username || !newEmployee.password) {
      showModal('Por favor, complete todos los campos para registrar al empleado.', true);
      return;
    }
    try {
      const employeesRef = collection(db, `/artifacts/${appId}/public/data/employees`);
      const querySnapshot = await getDocs(employeesRef);
      const existingUser = querySnapshot.docs.find(doc => doc.data().username === newEmployee.username);
      if (existingUser) {
        showModal('El nombre de usuario ya existe. Por favor, elija otro.', true);
        return;
      }
      await addDoc(employeesRef, {
        name: newEmployee.name,
        username: newEmployee.username,
        password: newEmployee.password,
        role: 'employee', // Asignar rol por defecto
        createdAt: new Date()
      });
      showModal('Empleado registrado con éxito.');
      setNewEmployee({ name: '', username: '', password: '' });
    } catch (error) {
      showModal('Error al registrar al empleado: ' + error.message, true);
      console.error("Error registering employee: ", error);
    }
  };

  const updateProductStock = async (productId, newStock) => {
    const stockValue = parseInt(newStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      showModal('El stock debe ser un número positivo.', true);
      return;
    }
    try {
      const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, productId);
      await updateDoc(productRef, { stock: stockValue });
      showModal('Stock actualizado con éxito.');
    } catch (error) {
      showModal('Error al actualizar el stock: ' + error.message, true);
      console.error("Error updating stock: ", error);
    }
  };

  const updateProductPrice = async (productId, newPrice) => {
    try {
      const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, productId);
      await updateDoc(productRef, { price: parseFloat(newPrice) });
      showModal('Precio actualizado con éxito.');
    } catch (error) {
      showModal('Error al actualizar el precio: ' + error.message, true);
      console.error("Error updating price: ", error);
    }
  };
  
  const updateProductCost = async (productId, newCost) => {
    try {
      const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, productId);
      await updateDoc(productRef, { cost: parseFloat(newCost) });
      showModal('Costo de compra actualizado con éxito.');
    } catch (error) {
      showModal('Error al actualizar el costo: ' + error.message, true);
      console.error("Error updating product cost: ", error);
    }
  };
  
  const handleBatchUpdate = async () => {
    if (!batchUpdate.value) {
      showModal('Por favor, ingrese un valor.', true);
      return;
    }
    const value = parseFloat(batchUpdate.value);
    if (isNaN(value)) {
        showModal('El valor debe ser un número.', true);
        return;
    }

    try {
        const inventarioRef = collection(db, `/artifacts/${appId}/users/${userId}/inventario`);
        const querySnapshot = await getDocs(inventarioRef);
        const batchUpdates = [];

        querySnapshot.docs.forEach(productDoc => {
            const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, productDoc.id);
            const currentPrice = productDoc.data().price;
            let newPrice;
            if (batchUpdate.type === 'percentage') {
                newPrice = currentPrice * (1 + value / 100);
            } else {
                newPrice = currentPrice + value;
            }
            batchUpdates.push(updateDoc(productRef, { price: newPrice }));
        });

        await Promise.all(batchUpdates);
        showModal('Precios actualizados en lote con éxito.');
    } catch (error) {
        showModal('Error al actualizar los precios: ' + error.message, true);
        console.error("Error during batch price update: ", error);
    }
  };

  const updateGlobalDiscount = async () => {
      const discountValue = parseFloat(document.getElementById('globalDiscountInput').value);
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
          showModal('El descuento debe ser un número entre 0 y 100.', true);
          return;
      }
      try {
          const discountRef = doc(db, `/artifacts/${appId}/users/${userId}/settings/discounts`);
          await setDoc(discountRef, { globalDiscount: discountValue });
          showModal('Descuento global actualizado con éxito.');
      } catch (error) {
          showModal('Error al actualizar el descuento global: ' + error.message, true);
          console.error("Error updating global discount: ", error);
      }
  };

  const handleReturn = async () => {
    if (!newReturn.productId || newReturn.quantity <= 0) {
      showModal('Por favor, seleccione un producto y una cantidad para la devolución.', true);
      return;
    }
    try {
      const productToReturn = products.find(p => p.id === newReturn.productId);
      if (!productToReturn) {
        showModal('Producto no encontrado.', true);
        return;
      }
      const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, newReturn.productId);
      const updatedStock = productToReturn.stock + newReturn.quantity;
      await updateDoc(productRef, { stock: updatedStock });
      
      const returnsRef = collection(db, `/artifacts/${appId}/public/data/devoluciones`);
      await addDoc(returnsRef, {
        productId: newReturn.productId,
        productName: productToReturn.name,
        quantity: newReturn.quantity,
        returnedBy: userName,
        timestamp: new Date()
      });
      showModal('Devolución registrada con éxito. Stock actualizado.');
      setNewReturn({ productId: '', quantity: 1 });
    } catch (error) {
      showModal('Error al procesar la devolución: ' + error.message, true);
      console.error("Error processing return: ", error);
    }
  };

  const handleBarcodeScan = (e) => {
    const barcode = e.target.value;
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setSearchQuery(''); // Limpiar la barra de búsqueda después de añadir
    }
  };


  const addToCart = (product) => {
    const quantityToAdd = parseInt(productQuantities[product.id], 10);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      showModal('La cantidad debe ser un número positivo.', true);
      return;
    }

    const productInStock = products.find(p => p.id === product.id);
    if (!productInStock || productInStock.stock < quantityToAdd) {
      showModal(`Stock insuficiente (${productInStock?.stock || 0}) para añadir ${quantityToAdd} unidades de ${product.name}.`, true);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantityToAdd;
      if (newQuantity > productInStock.stock) {
        showModal(`No hay suficiente stock para añadir ${quantityToAdd} más de este producto.`, true);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: newQuantity } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: quantityToAdd }]);
    }
    showModal(`${quantityToAdd} unidades de ${product.name} añadidas al carrito.`);
  };

  const decrementQuantity = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (!existingItem) return;

    if (existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    } else {
      removeItemFromCart(productId);
    }
  };

  const incrementQuantity = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    const productInStock = products.find(p => p.id === productId);

    if (!existingItem || !productInStock) return;

    if (existingItem.quantity >= productInStock.stock) {
      showModal('No hay suficiente stock para añadir más de este producto.', true);
      return;
    }

    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };
  
  const removeItemFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      showModal('El carrito está vacío.', true);
      return;
    }

    try {
      const batchUpdates = [];
      const salesLog = [];
      const ventasRef = collection(db, `/artifacts/${appId}/public/data/ventas`);

      const totalAmountBeforeDiscount = cart.reduce((total, item) => total + item.price * item.quantity, 0);
      const finalTotal = totalAmountBeforeDiscount * (1 - globalDiscount / 100);

      const totalCostOfSale = cart.reduce((total, item) => {
        const productData = products.find(p => p.id === item.id);
        return total + (productData?.cost || 0) * item.quantity;
      }, 0);
      const totalProfit = finalTotal - totalCostOfSale;

      for (const item of cart) {
        const productRef = doc(db, `/artifacts/${appId}/users/${userId}/inventario`, item.id);
        const newStock = item.stock - item.quantity;
        if (newStock < 0) {
          throw new Error(`Stock insuficiente para ${item.name}`);
        }
        batchUpdates.push(updateDoc(productRef, { stock: newStock }));
        salesLog.push({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          cost: products.find(p => p.id === item.id)?.cost || 0,
          total: item.price * item.quantity,
          timestamp: new Date().toISOString()
        });
      }

      await Promise.all(batchUpdates);
      await addDoc(ventasRef, {
        saleDetails: salesLog,
        totalAmount: finalTotal,
        totalCost: totalCostOfSale,
        totalProfit: totalProfit,
        discountApplied: globalDiscount,
        soldBy: userName,
        timestamp: new Date()
      });

      showModal('Venta finalizada con éxito.');
      printReceipt();
      setCart([]);
    } catch (error) {
      showModal('Error al finalizar la venta: ' + error.message, true);
      console.error("Error finalizing sale: ", error);
    }
  };

  const totalCartPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const discountedTotal = totalCartPrice * (1 - globalDiscount / 100);

  const getFilteredSales = () => {
    let filteredSales = salesHistory;
    if (filterDates.start) {
      const startDate = new Date(filterDates.start);
      filteredSales = filteredSales.filter(sale => new Date(sale.timestamp.seconds * 1000) >= startDate);
    }
    if (filterDates.end) {
      const endDate = new Date(filterDates.end);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      filteredSales = filteredSales.filter(sale => new Date(sale.timestamp.seconds * 1000) <= endDate);
    }
    return filteredSales;
  };
  
  const getDailySummary = () => {
    const dailyData = {};
    salesHistory.forEach(sale => {
      const date = new Date(sale.timestamp.seconds * 1000).toLocaleDateString('es-ES', { dateStyle: 'short' });
      if (!dailyData[date]) {
        dailyData[date] = {
          ingresos: 0,
          costos: 0,
          ganancia: 0
        };
      }
      dailyData[date].ingresos += sale.totalAmount;
      dailyData[date].costos += sale.totalCost;
      dailyData[date].ganancia += sale.totalProfit;
    });
    return Object.entries(dailyData).map(([date, data]) => ({ date, ...data }));
  };

  // Funciones para gestión de empleados (solo para admin)
  const handleRoleChange = async (employeeId, newRole) => {
    const employeeToUpdate = employees.find(e => e.id === employeeId);
    if (!employeeToUpdate) return;
  
    if (employeeToUpdate.username === userName && newRole === 'employee' && employeeToUpdate.role === 'admin') {
      showModal('No puedes degradar tu propio rol de administrador.', true);
      return;
    }
    
    showModal(`¿Está seguro de que desea cambiar el rol de ${employeeToUpdate.name} a ${newRole}?`, false, async () => {
      try {
        const employeeRef = doc(db, `/artifacts/${appId}/public/data/employees`, employeeId);
        await updateDoc(employeeRef, { role: newRole });
        showModal(`Rol de ${employeeToUpdate.name} actualizado a ${newRole} con éxito.`);
      } catch (error) {
        showModal('Error al actualizar el rol: ' + error.message, true);
        console.error("Error updating role: ", error);
      }
    });
  };

  const deleteEmployee = async (employeeId) => {
    const employeeToDelete = employees.find(e => e.id === employeeId);
    if (!employeeToDelete) return;
    
    if (employeeToDelete.username === 'admin') {
      showModal('No se puede eliminar al administrador principal.', true);
      return;
    }
    
    showModal(`¿Está seguro de que desea eliminar a ${employeeToDelete.name}?`, false, async () => {
      try {
        await deleteDoc(doc(db, `/artifacts/${appId}/public/data/employees`, employeeId));
        showModal('Empleado eliminado con éxito.');
      } catch (error) {
        showModal('Error al eliminar empleado: ' + error.message, true);
        console.error("Error deleting employee: ", error);
      }
    });
  };

  const renderContent = () => {
    const filteredProducts = products.filter(product => 
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (selectedCategoryFilter === '' || product.category === selectedCategoryFilter)
    );

    switch (currentView) {
      case 'login':
        return (
          <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-8">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Foto Aneuris</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="text"
                  placeholder="Usuario"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full font-semibold p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-600 hover:bg-indigo-700"
                >
                  Iniciar Sesión
                </button>
              </form>
            </div>
          </div>
        );

      case 'punto_de_venta':
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Punto de Venta</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Inventario de Productos</h3>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                  <input
                    type="text"
                    placeholder="Escanear código de barras o buscar producto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleBarcodeScan(e);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Todas las Categorías</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-gray-100 rounded-md shadow-sm">
                        <div>
                          <p className="font-semibold text-lg text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-600">Categoría: {product.category}</p>
                          <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                          <p className="font-bold text-indigo-600">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={productQuantities[product.id] || 1}
                            onChange={(e) => setProductQuantities({ ...productQuantities, [product.id]: e.target.value })}
                            className="w-16 p-2 border rounded-md text-center"
                          />
                          <button
                            onClick={() => addToCart(product)}
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500">No hay productos que coincidan con la búsqueda.</p>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-700">Carrito</h3>
                  <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                    {cart.length > 0 ? (
                      cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-100 rounded-md">
                          <p className="text-gray-800 font-semibold">{item.name}</p>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => decrementQuantity(item.id)} className="text-red-500 hover:text-red-700 font-bold text-lg">&minus;</button>
                            <span className="font-bold text-gray-700">{item.quantity}</span>
                            <button onClick={() => incrementQuantity(item.id)} className="text-green-500 hover:text-green-700 font-bold text-lg">+</button>
                          </div>
                          <p className="font-bold text-indigo-600">{formatCurrency(item.price * item.quantity)}</p>
                          <button
                            onClick={() => removeItemFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500">El carrito está vacío.</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center border-t border-gray-300 pt-4 mt-4">
                    <p className="text-xl font-bold text-gray-800">Subtotal:</p>
                    <p className="text-xl font-bold text-gray-600">{formatCurrency(totalCartPrice)}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xl font-bold text-gray-800">Descuento:</p>
                    <p className="text-xl font-bold text-gray-600">{globalDiscount}%</p>
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t border-gray-300 pt-4">
                    <p className="text-xl font-bold text-gray-800">Total:</p>
                    <p className="text-xl font-bold text-indigo-600">{formatCurrency(discountedTotal)}</p>
                  </div>
                  <button
                    onClick={finalizeSale}
                    className="w-full bg-indigo-600 text-white font-semibold p-4 rounded-md mt-4 hover:bg-indigo-700 transition-colors"
                  >
                    Finalizar Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'inventario':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Inventario General</h2>
            {lowStockProducts.length > 0 && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md shadow-md">
                <p className="font-bold">¡Alerta de Stock Bajo!</p>
                <p>Los siguientes productos tienen 5 o menos unidades:</p>
                <ul className="list-disc list-inside mt-2">
                  {lowStockProducts.map(p => (
                    <li key={p.id}>{p.name} (Stock: {p.stock})</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                <h3 className="text-xl font-semibold mb-4">Ajuste de Precios en Lote y Descuento Global</h3>
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 items-center">
                    <select
                        className="p-2 border rounded-md"
                        value={batchUpdate.type}
                        onChange={(e) => setBatchUpdate({ ...batchUpdate, type: e.target.value })}
                    >
                        <option value="percentage">Aumento/Descuento (%)</option>
                        <option value="fixed">Aumento Fijo (RD$)</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Valor"
                        className="p-2 border rounded-md w-32"
                        value={batchUpdate.value}
                        onChange={(e) => setBatchUpdate({ ...batchUpdate, value: e.target.value })}
                    />
                    <button onClick={handleBatchUpdate} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                        Aplicar
                    </button>
                    <div className="flex space-x-2 items-center">
                        <label className="whitespace-nowrap">Descuento Global (%):</label>
                        <input
                            id="globalDiscountInput"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            defaultValue={globalDiscount}
                            className="w-20 p-2 border rounded-md text-right"
                        />
                        <button onClick={updateGlobalDiscount} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código de Barras</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map(product => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          defaultValue={product.price}
                          onBlur={(e) => updateProductPrice(product.id, e.target.value)}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          defaultValue={product.cost}
                          onBlur={(e) => updateProductCost(product.id, e.target.value)}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          defaultValue={product.stock}
                          onBlur={(e) => updateProductStock(product.id, e.target.value)}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.barcode || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'entrada':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Entrada de Productos</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Añade un nuevo producto al inventario de la tienda. </p>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre del Producto"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Precio de Venta"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                 <input
                  type="number"
                  placeholder="Costo de Compra"
                  value={newProduct.cost}
                  onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Cantidad (Stock)"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Código de Barras (Opcional)"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                 <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione una categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addProductToInventory}
                  className="w-full bg-indigo-600 text-white font-semibold p-3 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Agregar Producto
                </button>
              </form>
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Gestionar Categorías</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Nueva categoría"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addCategory}
                    className="bg-gray-500 text-white p-3 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Añadir
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {categories.map(cat => (
                    <li key={cat} className="p-2 bg-gray-100 rounded-md text-sm text-gray-700">
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'salida':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Historial de Salida de Productos</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
              {salesHistory.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos Vendidos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesHistory.map(sale => (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.timestamp.seconds * 1000).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.soldBy}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <ul className="list-disc list-inside">
                            {sale.saleDetails.map((item, index) => (
                              <li key={index}>
                                {item.productName} ({item.quantity} uds.)
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {sale.discountApplied ? `${sale.discountApplied}%` : '0%'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500">No hay historial de ventas para mostrar.</p>
              )}
            </div>
          </div>
        );
      
      case 'employee_management':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Empleados</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg mb-8">
              <p className="text-gray-600 mb-6">Registre un nuevo empleado para que pueda acceder al sistema de punto de venta.</p>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Usuario"
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={registerEmployee}
                  className="w-full bg-green-600 text-white font-semibold p-3 rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Registrar Empleado
                </button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Gestión de Empleados</h3>
                <div className="space-y-2">
                    {employees.length > 0 ? (
                      employees.map(employee => (
                        <div key={employee.id} className="p-3 bg-gray-100 rounded-md flex justify-between items-center">
                            <p className="font-semibold text-gray-800">{employee.name}</p>
                            <span className="text-sm text-gray-500">Usuario: {employee.username}</span>
                            <div className="space-x-2 flex items-center">
                                <span className={`font-bold text-sm ${employee.role === 'admin' ? 'text-indigo-600' : 'text-gray-600'}`}>
                                    {employee.role === 'admin' ? 'Admin' : 'Empleado'}
                                </span>
                                <select
                                    className="p-1 border rounded-md text-sm"
                                    value={employee.role}
                                    onChange={(e) => handleRoleChange(employee.id, e.target.value)}
                                >
                                    <option value="employee">Empleado</option>
                                    <option value="admin">Administrador</option>
                                </select>
                                <button
                                    onClick={() => deleteEmployee(employee.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                      ))
                    ) : (
                        <p className="text-center text-gray-500">No hay empleados registrados.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );

      case 'devoluciones':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Devoluciones</h2>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
              <p className="text-gray-600 mb-6">Registre la devolución de un producto para actualizar el stock.</p>
              <form className="space-y-4">
                <select
                  value={newReturn.productId}
                  onChange={(e) => setNewReturn({ ...newReturn, productId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a devolver"
                  value={newReturn.quantity}
                  min="1"
                  onChange={(e) => setNewReturn({ ...newReturn, quantity: parseInt(e.target.value, 10) })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="w-full bg-red-600 text-white font-semibold p-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Procesar Devolución
                </button>
              </form>
            </div>
          </div>
        );

      case 'reportes':
        if (userRole !== 'admin') return <p className="p-6 text-red-500">Acceso denegado.</p>;
        const filteredSales = getFilteredSales();
        const salesByEmployee = filteredSales.reduce((acc, sale) => {
          acc[sale.soldBy] = (acc[sale.soldBy] || 0) + sale.totalAmount;
          return acc;
        }, {});
        const salesByEmployeeData = Object.entries(salesByEmployee).map(([name, total]) => ({ name, total }));
        const popularProducts = filteredSales.reduce((acc, sale) => {
          sale.saleDetails.forEach(item => {
            acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          });
          return acc;
        }, {});
        const sortedPopularProducts = Object.entries(popularProducts).sort(([,a],[,b]) => b-a).map(([name, quantity]) => ({ name, quantity }));
        const salesByDayData = getDailySummary();
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportes</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">Filtrar por Fechas</h3>
              <div className="flex space-x-4 items-center">
                <input
                  type="date"
                  value={filterDates.start}
                  onChange={(e) => setFilterDates({ ...filterDates, start: e.target.value })}
                  className="p-2 border rounded-md"
                />
                <span>a</span>
                <input
                  type="date"
                  value={filterDates.end}
                  onChange={(e) => setFilterDates({ ...filterDates, end: e.target.value })}
                  className="p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Análisis Financiero</h3>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ingresos Totales:</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Costos de Productos:</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </div>
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded-md">
                    <p className="font-semibold text-gray-800">Ganancia Neta:</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Ventas por Vendedor</h3>
                {salesByEmployeeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByEmployeeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={value => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total" name="Total Ventas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No hay datos para este período.</p>
                )}
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Resumen de Ventas Diarias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {salesByDayData.length > 0 ? (
                            salesByDayData.map(item => (
                                <div key={item.date} className="p-3 bg-gray-100 rounded-md">
                                    <h4 className="font-bold text-lg text-gray-800">{item.date}</h4>
                                    <p className="text-sm">Ingresos: <span className="font-semibold text-green-600">{formatCurrency(item.ingresos)}</span></p>
                                    <p className="text-sm">Costos: <span className="font-semibold text-red-600">{formatCurrency(item.costos)}</span></p>
                                    <p className="text-sm">Ganancia: <span className="font-semibold text-indigo-600">{formatCurrency(item.ganancia)}</span></p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No hay ventas registradas para este periodo.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Productos Populares</h3>
                    {sortedPopularProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={sortedPopularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" name="Unidades Vendidas" fill="#82ca9d" />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500">No hay datos para este período.</p>
                    )}
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <style>{`
        body {
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
        .bg-gradient-to-r {
          background-image: linear-gradient(to right, var(--tw-gradient-stops));
        }
      `}</style>
      {userRole && (
        <nav className="bg-indigo-600 text-white shadow-lg">
          <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="text-2xl font-bold">
              Foto Aneuris
            </div>
            <div className="hidden md:flex space-x-6">
              <button onClick={() => setCurrentView('punto_de_venta')} className="hover:text-indigo-200 transition-colors">Punto de Venta</button>
              {userRole === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('inventario')} className="hover:text-indigo-200 transition-colors">Inventario</button>
                  <button onClick={() => setCurrentView('entrada')} className="hover:text-indigo-200 transition-colors">Entrada</button>
                  <button onClick={() => setCurrentView('salida')} className="hover:text-indigo-200 transition-colors">Salida</button>
                  <button onClick={() => setCurrentView('devoluciones')} className="hover:text-indigo-200 transition-colors">Devoluciones</button>
                  <button onClick={() => setCurrentView('reportes')} className="hover:text-indigo-200 transition-colors">Reportes</button>
                  <button onClick={() => setCurrentView('employee_management')} className="hover:text-indigo-200 transition-colors">Empleados</button>
                </>
              )}
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm">Hola, {userName}</span>
              <button onClick={handleLogout} className="bg-white text-indigo-600 px-4 py-1 rounded-full font-semibold hover:bg-indigo-100 transition-colors">
                Cerrar Sesión
              </button>
            </div>
            <div className="md:hidden">
              <button className="text-white focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="container mx-auto px-6 py-8">
        {renderContent()}
      </main>

      {modal.visible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className={`bg-white p-6 rounded-lg shadow-xl max-w-sm w-full transition-all transform ${modal.visible ? 'scale-100' : 'scale-95'}`}>
            <div className={`text-center font-bold text-xl mb-4 ${modal.isError ? 'text-red-600' : 'text-green-600'}`}>
              {modal.isError ? 'Error' : 'Éxito'}
            </div>
            <p className="text-center text-gray-700 mb-6">{modal.message}</p>
            <div className="flex justify-end space-x-4">
              {modal.onConfirm && (
                <button
                  onClick={() => {
                    modal.onConfirm();
                    setModal({ visible: false, message: '', isError: false, onConfirm: null });
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  Confirmar
                </button>
              )}
              <button
                onClick={() => setModal({ visible: false, message: '', isError: false, onConfirm: null })}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
