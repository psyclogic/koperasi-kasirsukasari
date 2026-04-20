import React, { useState, useEffect } from 'react';
// IMPORT FIREBASE
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; 
import { Search, ShoppingCart, Plus, Minus, Trash2, ReceiptText, Package, CheckCircle2, AlertCircle, X, FileText, BarChart3, Clock, Calendar, Filter, ListOrdered, Eye, User, Lock, LogOut, Edit3, ArrowUpDown, ChevronDown, TrendingUp, Activity, Download, Image as ImageIcon, LayoutGrid, List, ClipboardList, Wallet, TrendingDown, Settings, Database, RotateCcw, ArchiveX, Upload, Check, Share2, Loader2, Link2, Layers } from 'lucide-react';

// ==========================================
// KONFIGURASI FIREBASE ANDA
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAV1J2rWzglwIy-_PJ3CgnfWJkP7VJsq_I",
  authDomain: "kasir-koperasi-sukasari.firebaseapp.com",
  projectId: "kasir-koperasi-sukasari",
  storageBucket: "kasir-koperasi-sukasari.firebasestorage.app",
  messagingSenderId: "405477869679",
  appId: "1:405477869679:web:2fa809c5c4d7cab19e659a"
};

// Inisialisasi Aplikasi, Database, & Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

// ==========================================
// KOMPONEN LOGO KOPERASI
// ==========================================
const LogoKoperasi = ({ sizeClass = "w-16 h-16", iconSize = 32 }) => {
  const [hasError, setHasError] = useState(false);
  return (
    // Menggunakan rounded-xl untuk kotak dengan sudut melengkung
    <div className={`bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden shrink-0 ${sizeClass}`}>
      {!hasError ? (
        <img 
          src="LOGO KDMP SUKASARI.png" // Mengembalikan ke .png sesuai permintaan
          alt="Logo Koperasi" 
          className="w-full h-full object-contain p-1" // object-contain agar logo utuh tidak terpotong
          onError={() => setHasError(true)} 
        />
      ) : (
        <ShoppingCart size={iconSize} className="text-red-600" />
      )}
    </div>
  );
};

export default function App() {
  // State Autentikasi
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // State Aplikasi
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua"); 
  const [searchTrxQuery, setSearchTrxQuery] = useState("");
  const [customerName, setCustomerName] = useState(""); 
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // State Navigasi & Mobile UX
  const [activeTab, setActiveTab] = useState("kasir");
  const [laporanTab, setLaporanTab] = useState("penjualan");
  const [showMobileCart, setShowMobileCart] = useState(false); 
  const [viewMode, setViewMode] = useState("list"); 
  const [showCategoryMenu, setShowCategoryMenu] = useState(false); 
  
  // State untuk Tambah & Edit Barang (Khusus Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    code: '', name: '', buyPrice: '', price: '', stock: '', category: 'Sembako',
    hasVariations: false, variations: [], useLinkedStock: false, linkedProductId: ''
  });
  const [editingProduct, setEditingProduct] = useState(null);
  
  // State untuk Sorting Gudang
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [showSortMenu, setShowSortMenu] = useState(false);

  // State untuk Laporan & Transaksi
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactionToRestore, setTransactionToRestore] = useState(null);
  const [transactionToPermanentDelete, setTransactionToPermanentDelete] = useState(null);
  const [viewTrash, setViewTrash] = useState(false); 

  // State Khusus Variasi (Kasir UI)
  const [selectedProductForVariation, setSelectedProductForVariation] = useState(null);

  // State untuk Sistem/Backup
  const [fileToRestore, setFileToRestore] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [systemMsg, setSystemMsg] = useState({ type: '', text: '' });
  const fileInputRef = React.useRef(null);

  // State Stock Opname
  const [opnameData, setOpnameData] = useState([]);
  const [opnamePeriod, setOpnamePeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameForm, setOpnameForm] = useState(() => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { id: '', date: localDate, itemName: '', prevStock: '', inQty: '', buyPrice: '', outQty: '', sellPrice: '' };
  });
  const [opnameToDelete, setOpnameToDelete] = useState(null);
  
  const getLocalDateString = (date) => {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        let role = 'kasir';
        let displayUsername = user.email.split('@')[0];
        let defaultTab = 'kasir';

        if (user.email === 'yoga@koperasi.com') {
          role = 'admin';
          displayUsername = 'Admin';
        } else if (user.email === 'backup@koperasi.com') {
          role = 'backup';
          displayUsername = 'Database Admin';
          defaultTab = 'pengaturan';
        } else if (user.email === 'ayu@koperasi.com') {
          role = 'kasir';
          displayUsername = 'Kasir 1';
        }

        setCurrentUser({ uid: user.uid, email: user.email, username: displayUsername, role: role });
        if (activeTab === 'kasir' && role === 'backup') setActiveTab(defaultTab);
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    });

    const unsubscribeSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a, b) => b.timestamp - a.timestamp);
      setSalesHistory(salesData);
    });

    const unsubscribeOpname = onSnapshot(collection(db, 'stock_opname'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOpnameData(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribeOpname();
    };
  }, []); 

  const getEffectiveStock = (product, variationId = null) => {
    if (!product) return 0;
    if (product.useLinkedStock && product.linkedProductId) {
      const parentProd = products.find(p => p.id === product.linkedProductId);
      return parentProd ? Number(parentProd.stock) : 0;
    }
    if (variationId && product.hasVariations && product.variations) {
      const vari = product.variations.find(v => v.id === variationId);
      return vari ? Number(vari.stock) : 0;
    }
    return Number(product.stock) || 0;
  };

  const getEffectivePrice = (product) => {
    if (product.hasVariations && product.variations && product.variations.length > 0) {
      const lowest = Math.min(...product.variations.map(v => Number(v.price)));
      return lowest;
    }
    return Number(product.price);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    let loginEmail = loginForm.username.trim().toLowerCase();
    if (!loginEmail.includes('@')) loginEmail = `${loginEmail}@koperasi.com`;

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginForm.password);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Username atau password salah!');
      } else if (error.code === 'auth/network-request-failed') {
        setLoginError('Tidak ada koneksi internet!');
      } else {
        setLoginError('Gagal masuk. Silakan coba lagi.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); 
      setCart([]);
      setActiveTab("kasir");
      setViewTrash(false);
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);
  };

  const filteredProducts = products
    .filter(p => {
      const matchSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = selectedCategory === "Semua" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const sortedProducts = React.useMemo(() => {
    let sortableItems = [...products.filter(p => {
      const sQ = searchQuery.toLowerCase();
      const matchName = (p.name || "").toLowerCase().includes(sQ);
      const matchCat = (p.category || "").toLowerCase().includes(sQ);
      const matchCode = (p.code || "").toLowerCase().includes(sQ);
      return matchName || matchCat || matchCode;
    })];

    sortableItems.sort((a, b) => {
      if (sortConfig.key === 'stock') {
        const stockA = getEffectiveStock(a);
        const stockB = getEffectiveStock(b);
        return sortConfig.direction === 'asc' ? stockA - stockB : stockB - stockA;
      } 
      else if (sortConfig.key === 'createdAt') {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      } 
      else {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return sortConfig.direction === 'asc' 
          ? nameA.localeCompare(nameB, undefined, { numeric: true }) 
          : nameB.localeCompare(nameA, undefined, { numeric: true });
      }
    });
    return sortableItems;
  }, [products, searchQuery, sortConfig]);

  const handleProductClick = (product) => {
    if (product.hasVariations && product.variations && product.variations.length > 0) {
      setSelectedProductForVariation(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product, variation = null) => {
    setErrorMsg("");
    const cartItemId = variation ? `${product.id}-${variation.id}` : product.id;
    const maxStock = getEffectiveStock(product, variation?.id);

    const existingItem = cart.find(item => item.cartItemId === cartItemId);
    
    if (existingItem) {
      if (existingItem.qty >= maxStock) return setErrorMsg(`Stok tidak mencukupi!`);
      setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      if (maxStock <= 0) return setErrorMsg(`Stok habis!`);
      setCart([...cart, { 
        cartItemId: cartItemId,
        id: product.id, 
        variationId: variation?.id || null,
        name: variation ? `${product.name} - ${variation.name}` : product.name,
        price: Number(variation ? variation.price : product.price),
        buyPrice: Number(variation ? variation.buyPrice : product.buyPrice),
        qty: 1 
      }]);
    }
  };

  const updateQuantity = (cartItemId, delta) => {
    setErrorMsg("");
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.qty + delta;
        const productData = products.find(p => p.id === item.id);
        const maxStock = getEffectiveStock(productData, item.variationId);
        
        if (newQty > maxStock) {
          setErrorMsg(`Stok maksimal adalah ${maxStock}`);
          return item;
        }
        if (newQty <= 0) return null;
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartItemId) => {
    setCart(cart.filter(item => item.cartItemId !== cartItemId));
    setErrorMsg("");
    if (cart.length === 1) setShowMobileCart(false); 
  };

  const handleDirectQuantityChange = (cartItemId, value) => {
    setErrorMsg("");
    if (value === "") return setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, qty: "" } : item));
    const newQty = parseInt(value, 10);
    if (isNaN(newQty)) return;
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const productData = products.find(p => p.id === item.id);
        const maxStock = getEffectiveStock(productData, item.variationId);
        if (newQty > maxStock) {
          setErrorMsg(`Stok maksimal adalah ${maxStock}`);
          return { ...item, qty: maxStock };
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleQuantityBlur = (cartItemId) => {
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        if (item.qty === "" || item.qty <= 0) return { ...item, qty: 1 };
      }
      return item;
    }));
  };

  const handleAddPayment = (amount) => {
    setPaymentAmount(prev => {
      const current = Number(prev) || 0;
      const nextAmount = current + amount;
      return nextAmount > 0 ? nextAmount.toString() : "";
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * (item.qty || 0)), 0);
  const changeAmount = parseFloat(paymentAmount || 0) - totalAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return setErrorMsg("Keranjang masih kosong!");
    if (cart.some(item => item.qty === "" || item.qty <= 0)) return setErrorMsg("Ada barang dengan jumlah tidak valid!");
    if (parseFloat(paymentAmount || 0) < totalAmount) return setErrorMsg("Uang pembayaran kurang!");

    try {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      const formattedDate = `${d}/${mo}/${y} ${h}:${m}`;

      let finalCustomerName = customerName.trim();
      if (!finalCustomerName) finalCustomerName = `BLJ-${h}${m}/${d}/${mo}/${y}`;

      const transactionData = {
        date: formattedDate,
        timestamp: Date.now(),
        items: [...cart],
        total: totalAmount,
        payment: parseFloat(paymentAmount),
        change: changeAmount,
        cashier: currentUser.username,
        customer: finalCustomerName,
        status: 'active' 
      };

      const docRef = await addDoc(collection(db, 'sales'), transactionData);
      
      const opnameDateStr = `${y}-${mo}-${d}`;
      const opnamePeriodStr = `${y}-${mo}`;

      for (const item of cart) {
        const originalProduct = products.find(p => p.id === item.id);
        if (!originalProduct) continue;

        const productRef = doc(db, 'products', originalProduct.id);
        const prevEffectiveStock = getEffectiveStock(originalProduct, item.variationId);

        if (originalProduct.useLinkedStock && originalProduct.linkedProductId) {
          const parentProd = products.find(p => p.id === originalProduct.linkedProductId);
          if (parentProd) {
            const parentRef = doc(db, 'products', parentProd.id);
            await updateDoc(parentRef, { stock: Number(parentProd.stock) - item.qty });
          }
        } else if (item.variationId && originalProduct.hasVariations) {
          const updatedVariations = originalProduct.variations.map(v => 
            v.id === item.variationId ? { ...v, stock: Number(v.stock) - item.qty } : v
          );
          const totalNewStock = updatedVariations.reduce((sum, v) => sum + Number(v.stock), 0);
          await updateDoc(productRef, { 
            stock: totalNewStock, 
            variations: updatedVariations 
          });
        } else {
          await updateDoc(productRef, { stock: Number(originalProduct.stock) - item.qty });
        }

        const opnameDataToSave = {
          period: opnamePeriodStr,
          date: opnameDateStr,
          itemName: item.name, 
          prevStock: prevEffectiveStock,
          inQty: 0,
          buyPrice: item.buyPrice || 0,
          outQty: item.qty,
          sellPrice: item.price,
          timestamp: Date.now(),
          trxId: docRef.id,
          isAuto: true,
          status: 'active'
        };
        await addDoc(collection(db, 'stock_opname'), opnameDataToSave);
      }

      setReceiptData({ ...transactionData, id: docRef.id });
      setCart([]);
      setPaymentAmount("");
      setCustomerName("");
      setErrorMsg("");
      setShowMobileCart(false);
      setShowReceipt(true);
    } catch (error) {
      console.error("Gagal transaksi: ", error);
      setErrorMsg("Terjadi kesalahan saat memproses transaksi.");
    }
  };

  const handleVariationChange = (index, field, value, isNew = true) => {
    const stateModifier = isNew ? setNewProduct : setEditingProduct;
    stateModifier(prev => {
      const updatedVars = [...prev.variations];
      updatedVars[index] = { ...updatedVars[index], [field]: value };
      return { ...prev, variations: updatedVars };
    });
  };

  const addVariationField = (isNew = true) => {
    const stateModifier = isNew ? setNewProduct : setEditingProduct;
    stateModifier(prev => ({
      ...prev,
      variations: [...prev.variations, { id: Date.now().toString() + Math.random(), name: '', code: '', buyPrice: '', price: '', stock: '' }]
    }));
  };

  const removeVariationField = (index, isNew = true) => {
    const stateModifier = isNew ? setNewProduct : setEditingProduct;
    stateModifier(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.category) return setErrorMsg("Mohon lengkapi nama dan kategori!");
    
    let finalStock = 0;
    if (newProduct.hasVariations) {
      if (newProduct.variations.length === 0) return setErrorMsg("Mohon tambah minimal 1 variasi barang!");
      for (const v of newProduct.variations) {
        if (!v.name || !v.price || !v.stock) return setErrorMsg("Lengkapi nama, harga jual, dan stok di semua variasi!");
      }
      finalStock = newProduct.variations.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    } else if (newProduct.useLinkedStock) {
      if (!newProduct.linkedProductId) return setErrorMsg("Pilih barang induk untuk disambungkan stoknya!");
      if (!newProduct.price) return setErrorMsg("Mohon lengkapi Harga Jual barang ini!");
      finalStock = 0; 
    } else {
      if (!newProduct.price || !newProduct.stock) return setErrorMsg("Lengkapi harga dan stok barang!");
      finalStock = Number(newProduct.stock);
    }

    try {
      await addDoc(collection(db, 'products'), {
        code: newProduct.code || '',
        name: newProduct.name,
        category: newProduct.category || "Sembako",
        hasVariations: newProduct.hasVariations,
        variations: newProduct.hasVariations ? newProduct.variations : [],
        useLinkedStock: newProduct.useLinkedStock,
        linkedProductId: newProduct.useLinkedStock ? newProduct.linkedProductId : '',
        buyPrice: newProduct.hasVariations ? 0 : parseFloat(newProduct.buyPrice || 0),
        price: newProduct.hasVariations ? 0 : parseFloat(newProduct.price || 0),
        stock: finalStock,
        createdAt: Date.now() 
      });

      setShowAddModal(false);
      setNewProduct({ code: '', name: '', buyPrice: '', price: '', stock: '', category: 'Sembako', hasVariations: false, variations: [], useLinkedStock: false, linkedProductId: '' });
      setErrorMsg("");
    } catch (error) {
      setErrorMsg("Gagal menyimpan data barang ke server.");
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.name) return setErrorMsg("Mohon lengkapi nama!");

    let finalStock = 0;
    if (editingProduct.hasVariations) {
      if (editingProduct.variations.length === 0) return setErrorMsg("Mohon tambah minimal 1 variasi barang!");
      for (const v of editingProduct.variations) {
        if (!v.name || !v.price || !v.stock) return setErrorMsg("Lengkapi nama, harga jual, dan stok di semua variasi!");
      }
      finalStock = editingProduct.variations.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    } else if (editingProduct.useLinkedStock) {
      if (!editingProduct.linkedProductId) return setErrorMsg("Pilih barang induk untuk disambungkan stoknya!");
      if (!editingProduct.price) return setErrorMsg("Mohon lengkapi Harga Jual barang ini!");
      finalStock = 0; 
    } else {
      if (!editingProduct.price || !editingProduct.stock) return setErrorMsg("Lengkapi harga dan stok barang!");
      finalStock = Number(editingProduct.stock);
    }

    try {
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        code: editingProduct.code || '',
        name: editingProduct.name,
        category: editingProduct.category,
        hasVariations: editingProduct.hasVariations,
        variations: editingProduct.hasVariations ? editingProduct.variations : [],
        useLinkedStock: editingProduct.useLinkedStock,
        linkedProductId: editingProduct.useLinkedStock ? editingProduct.linkedProductId : '',
        buyPrice: editingProduct.hasVariations ? 0 : parseFloat(editingProduct.buyPrice || 0),
        price: editingProduct.hasVariations ? 0 : parseFloat(editingProduct.price || 0),
        stock: finalStock
      });

      setEditingProduct(null);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg("Gagal mengupdate barang di server.");
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      for (const item of transactionToDelete.items) {
        const originalProduct = products.find(p => p.id === item.id);
        if (originalProduct) {
          const productRef = doc(db, 'products', originalProduct.id);
          
          if (originalProduct.useLinkedStock && originalProduct.linkedProductId) {
            const parentProd = products.find(p => p.id === originalProduct.linkedProductId);
            if (parentProd) {
              await updateDoc(doc(db, 'products', parentProd.id), { stock: Number(parentProd.stock) + item.qty });
            }
          } else if (item.variationId && originalProduct.hasVariations) {
            const updatedVariations = originalProduct.variations.map(v => 
              v.id === item.variationId ? { ...v, stock: Number(v.stock) + item.qty } : v
            );
            const totalNewStock = updatedVariations.reduce((sum, v) => sum + Number(v.stock), 0);
            await updateDoc(productRef, { stock: totalNewStock, variations: updatedVariations });
          } else {
            await updateDoc(productRef, { stock: Number(originalProduct.stock) + item.qty });
          }
        }
      }

      await updateDoc(doc(db, 'sales', transactionToDelete.id), { status: 'deleted', deletedAt: Date.now() });

      const opnamesToSoftDelete = opnameData.filter(op => op.trxId === transactionToDelete.id);
      for (const op of opnamesToSoftDelete) {
        await updateDoc(doc(db, 'stock_opname', op.id), { status: 'deleted' });
      }

      setTransactionToDelete(null);
    } catch (error) {
      setErrorMsg("Gagal membatalkan transaksi.");
    }
  };

  const confirmRestoreTransaction = async () => {
    if (!transactionToRestore) return;

    try {
      for (const item of transactionToRestore.items) {
        const originalProduct = products.find(p => p.id === item.id);
        const effectiveStock = getEffectiveStock(originalProduct, item.variationId);
        
        if (!originalProduct || effectiveStock < item.qty) {
          setErrorMsg(`Gagal: Stok saat ini tidak mencukupi untuk merestore transaksi!`);
          setTransactionToRestore(null);
          return;
        }
      }

      for (const item of transactionToRestore.items) {
        const originalProduct = products.find(p => p.id === item.id);
        const productRef = doc(db, 'products', originalProduct.id);
        
        if (originalProduct.useLinkedStock && originalProduct.linkedProductId) {
          const parentProd = products.find(p => p.id === originalProduct.linkedProductId);
          await updateDoc(doc(db, 'products', parentProd.id), { stock: Number(parentProd.stock) - item.qty });
        } else if (item.variationId && originalProduct.hasVariations) {
          const updatedVariations = originalProduct.variations.map(v => 
            v.id === item.variationId ? { ...v, stock: Number(v.stock) - item.qty } : v
          );
          const totalNewStock = updatedVariations.reduce((sum, v) => sum + Number(v.stock), 0);
          await updateDoc(productRef, { stock: totalNewStock, variations: updatedVariations });
        } else {
          await updateDoc(productRef, { stock: Number(originalProduct.stock) - item.qty });
        }
      }

      await updateDoc(doc(db, 'sales', transactionToRestore.id), { status: 'active', deletedAt: null });

      const opnamesToRestore = opnameData.filter(op => op.trxId === transactionToRestore.id);
      for (const op of opnamesToRestore) {
        await updateDoc(doc(db, 'stock_opname', op.id), { status: 'active' });
      }

      setTransactionToRestore(null);
    } catch (error) {
      setErrorMsg("Gagal merestore transaksi.");
    }
  };

  const confirmPermanentDeleteTransaction = async () => {
    if (!transactionToPermanentDelete) return;
    try {
      await deleteDoc(doc(db, 'sales', transactionToPermanentDelete.id));
      const opnamesToDelete = opnameData.filter(op => op.trxId === transactionToPermanentDelete.id);
      for (const op of opnamesToDelete) await deleteDoc(doc(db, 'stock_opname', op.id));
      setTransactionToPermanentDelete(null);
    } catch (error) {
      setErrorMsg("Gagal menghapus transaksi secara permanen.");
    }
  };

  const handleBackupDatabase = () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(), backupDate: getLocalDateString(),
        data: { products: products, sales: salesHistory, stock_opname: opnameData }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Backup_DB_Koperasi_${getLocalDateString()}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSystemMsg({ type: 'success', text: 'File backup berhasil diunduh.' });
    } catch (error) {
      setSystemMsg({ type: 'error', text: 'Gagal membuat file backup.' });
    }
  };

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (file) setFileToRestore(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeRestoreDatabase = () => {
    if (!fileToRestore) return;
    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.data) throw new Error("Format file JSON tidak sesuai.");
        const { products, sales, stock_opname } = parsed.data;

        if (products) for (const item of products) { const { id, ...data } = item; await setDoc(doc(db, 'products', id), data); }
        if (sales) for (const item of sales) { const { id, ...data } = item; await setDoc(doc(db, 'sales', id), data); }
        if (stock_opname) for (const item of stock_opname) { const { id, ...data } = item; await setDoc(doc(db, 'stock_opname', id), data); }

        setFileToRestore(null);
        setSystemMsg({ type: 'success', text: 'Database berhasil dipulihkan dari file backup.' });
      } catch (error) {
        setFileToRestore(null);
        setSystemMsg({ type: 'error', text: 'Gagal memulihkan database: ' + error.message });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(fileToRestore);
  };

  const handleOpnameProductSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const prod = products.find(p => p.id === selectedId);
    if (prod) {
      const effPrice = getEffectivePrice(prod);
      const effStock = getEffectiveStock(prod);
      
      setOpnameForm(prev => ({
        ...prev,
        itemName: prod.name,
        buyPrice: prod.buyPrice || 0,
        sellPrice: effPrice || 0,
        prevStock: effStock || 0
      }));
    }
  };

  const handleSaveOpname = async (e) => {
    e.preventDefault();
    try {
      const dynamicPeriod = opnameForm.date ? opnameForm.date.substring(0, 7) : opnamePeriod;
      const dataToSave = {
        period: dynamicPeriod, date: opnameForm.date, itemName: opnameForm.itemName,
        prevStock: Number(opnameForm.prevStock) || 0, inQty: Number(opnameForm.inQty) || 0,
        buyPrice: Number(opnameForm.buyPrice) || 0, outQty: Number(opnameForm.outQty) || 0,
        sellPrice: Number(opnameForm.sellPrice) || 0, timestamp: opnameForm.timestamp || Date.now(),
        status: 'active'
      };
      if (opnameForm.isAuto) dataToSave.isAuto = true;
      if (opnameForm.trxId) dataToSave.trxId = opnameForm.trxId;

      if (opnameForm.id) await updateDoc(doc(db, 'stock_opname', opnameForm.id), dataToSave);
      else await addDoc(collection(db, 'stock_opname'), dataToSave);
      
      setShowOpnameModal(false);
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setOpnameForm({ id: '', date: localDate, itemName: '', prevStock: '', inQty: '', buyPrice: '', outQty: '', sellPrice: '' });
      setErrorMsg("");
    } catch (error) {
      setErrorMsg("Gagal menyimpan data opname.");
    }
  };

  const executeDeleteOpname = async () => {
    if (!opnameToDelete) return;
    try {
      await deleteDoc(doc(db, 'stock_opname', opnameToDelete));
      setOpnameToDelete(null);
    } catch (error) {
      setErrorMsg("Gagal menghapus catatan opname.");
    }
  };

  const filteredOpnameData = opnameData
    .filter(item => item.period === opnamePeriod && item.status !== 'deleted')
    .sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.timestamp - a.timestamp;
    });

  const opnameTotalPembelian = filteredOpnameData.reduce((sum, item) => sum + (item.inQty * item.buyPrice), 0);
  const opnameTotalOmset = filteredOpnameData.reduce((sum, item) => sum + (item.outQty * item.sellPrice), 0);
  const opnameTotalLaba = filteredOpnameData.reduce((sum, item) => sum + ((item.outQty * item.sellPrice) - (item.outQty * item.buyPrice)), 0);

  const getReceiptCanvas = (data) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const headerHeight = 175;
    const itemHeight = 25;
    const itemsTotalHeight = data.items.length * itemHeight;
    const footerHeight = 120;
    
    canvas.width = 400;
    canvas.height = headerHeight + itemsTotalHeight + footerHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    ctx.font = 'bold 16px Arial';
    ctx.fillText('KOPERASI DESA MERAH PUTIH', 200, 35);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('SUKASARI KECAMATAN DAWUAN', 200, 55);

    ctx.font = '14px Arial';
    ctx.fillText(data.date, 200, 85);
    ctx.font = '12px Courier New';
    ctx.fillText(`ID: #${data.id.toString().slice(-6)} | Kasir: ${data.cashier}`, 200, 105);
    
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Pemesan: ${data.customer}`, 200, 135);

    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, 155);
    ctx.lineTo(380, 155);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.setLineDash([]);
    let y = 180;
    data.items.forEach(item => {
      ctx.font = '14px Arial';
      ctx.fillText(`${item.name} x${item.qty}`, 20, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(item.price * item.qty), 380, y);
      ctx.textAlign = 'left';
      y += itemHeight;
    });

    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, y - 10);
    ctx.lineTo(380, y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    y += 20;

    ctx.font = 'bold 16px Arial';
    ctx.fillText('Total', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(data.total), 380, y);

    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    y += 25;
    ctx.fillText('Tunai', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(data.payment), 380, y);

    ctx.textAlign = 'left';
    y += 25;
    ctx.fillText('Kembali', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(data.change), 380, y);

    return canvas;
  };

  const downloadReceiptJPG = (data) => {
    const canvas = getReceiptCanvas(data);
    const link = document.createElement('a');
    link.download = `Nota_${data.customer.replace(/[^a-z0-9]/gi, '_')}_${data.id}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  const shareReceipt = async (data) => {
    const canvas = getReceiptCanvas(data);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `Nota_${data.customer.replace(/[^a-z0-9]/gi, '_')}_${data.id}.jpg`, { type: 'image/jpeg' });
      
      const shareData = {
        title: 'Nota Transaksi',
        text: `Terima kasih! Berikut nota transaksi untuk ${data.customer}`,
        files: [file]
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          console.log('Share dibatalkan atau gagal:', error);
        }
      } else {
        const textFallback = `*KOPERASI DESA MERAH PUTIH*\nNota ID: #${data.id.toString().slice(-6)}\nPemesan: ${data.customer}\nTotal: ${formatRupiah(data.total)}\nTerima kasih!`;
        if (navigator.share) navigator.share({ title: 'Nota Transaksi', text: textFallback }).catch(console.log);
        else alert("Browser Anda tidak mendukung fitur bagikan.");
      }
    }, 'image/jpeg', 1.0);
  };

  const baseFilteredSales = salesHistory.filter(trx => {
    let isValid = true;
    const parts = trx.date.split(' ')[0].split('/'); 
    const trxDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); 

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (trxDate < start) isValid = false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (trxDate > end) isValid = false;
    }
    if (searchTrxQuery && !trx.customer.toLowerCase().includes(searchTrxQuery.toLowerCase())) {
      isValid = false;
    }
    return isValid;
  });

  const activeFilteredSales = baseFilteredSales.filter(trx => trx.status !== 'deleted');
  const deletedFilteredSales = baseFilteredSales.filter(trx => trx.status === 'deleted');
  const displaySales = viewTrash ? deletedFilteredSales : activeFilteredSales;
  const reportSales = activeFilteredSales;

  const totalRevenue = reportSales.reduce((sum, trx) => sum + trx.total, 0);
  const totalProfit = reportSales.reduce((sum, trx) => {
    const trxProfit = trx.items.reduce((itemSum, item) => itemSum + ((item.price - (item.buyPrice || item.price)) * item.qty), 0);
    return sum + trxProfit;
  }, 0);
  const totalTransactionsCount = reportSales.length;
  
  const itemSummary = {};
  reportSales.forEach(trx => {
    trx.items.forEach(item => {
      if (!itemSummary[item.name]) {
        itemSummary[item.name] = { 
          name: item.name, category: "Penjualan", 
          buyPrice: item.buyPrice || item.price, price: item.price,
          qty: 0, totalSales: 0, totalProfit: 0
        };
      }
      itemSummary[item.name].qty += item.qty;
      itemSummary[item.name].totalSales += (item.qty * item.price);
      itemSummary[item.name].totalProfit += (item.qty * (item.price - (item.buyPrice || item.price)));
    });
  });
  const topSellingItems = Object.values(itemSummary).sort((a, b) => b.qty - a.qty);

  const dailyTransactions = {};
  reportSales.forEach(trx => {
    const dateStr = trx.date.split(' ')[0];
    if (!dailyTransactions[dateStr]) dailyTransactions[dateStr] = { count: 0, omset: 0, profit: 0 };
    dailyTransactions[dateStr].count += 1;
    dailyTransactions[dateStr].omset += trx.total;
    const profit = trx.items.reduce((sum, item) => sum + ((item.price - (item.buyPrice || item.price)) * item.qty), 0);
    dailyTransactions[dateStr].profit += profit;
  });
  const dailyTrxArray = Object.keys(dailyTransactions).map(date => ({ date, ...dailyTransactions[date] })).sort((a, b) => {
    const [d1, m1, y1] = a.date.split('/');
    const [d2, m2, y2] = b.date.split('/');
    return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
  });

  const exportToExcelCSV = (filename, headers, rows) => {
    const csvContent = "\ufeff" + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".csv";
    link.click();
  };

  const exportToWord = (filename, title, headers, rows) => {
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;}table{border-collapse:collapse;width:100%;margin-top:20px;}th,td{border:1px solid #475569;padding:10px;text-align:left;}th{background-color:#fca5a5;color:#000;font-weight:bold;}h2{text-align:center;color:#b91c1c;font-family:Arial,sans-serif;}.periode{text-align:center;margin-bottom:20px;color:#475569;font-style:italic;}</style></head><body><h2>${title}</h2><div class="periode">Periode Laporan: ${startDate} s/d ${endDate}</div><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, index) => {const cellStyle = index === rows.length - 1 ? 'font-weight: bold; background-color: #f1f5f9;' : '';return `<tr>${r.map(c => `<td style="${cellStyle}">${c}</td>`).join('')}</tr>`;}).join('')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".doc";
    link.click();
  };

  const handleDownload = (format) => {
    let title, filename, headers, rows, totalsRow, allRows;
    if (laporanTab === 'penjualan') {
      title = "Laporan Penjualan - Koperasi Merah Putih"; filename = `Laporan_Penjualan_${startDate}_sd_${endDate}`; headers = ["Nama Barang", "Kategori", "Jumlah Terjual", "Total Penjualan (Rp)"];
      rows = topSellingItems.map(item => [item.name, item.category, item.qty, item.totalSales]); totalsRow = ["TOTAL KESELURUHAN", "-", topSellingItems.reduce((s,i) => s + i.qty, 0), topSellingItems.reduce((s,i) => s + i.totalSales, 0)];
      allRows = [...rows, totalsRow];
      if (format === 'excel') exportToExcelCSV(filename, headers, allRows); else exportToWord(filename, title, headers, allRows.map(r => [r[0], r[1], r[2], r[3] !== "-" ? formatRupiah(r[3]) : "-"]));
    } else if (laporanTab === 'keuntungan') {
      title = "Laporan Margin Keuntungan"; filename = `Laporan_Keuntungan_${startDate}_sd_${endDate}`; headers = ["Nama Barang", "Jumlah Terjual", "Harga Beli (Rp)", "Harga Jual (Rp)", "Profit per Unit (Rp)", "Total Profit (Rp)"];
      rows = topSellingItems.map(item => [item.name, item.qty, item.buyPrice, item.price, item.price - item.buyPrice, item.totalProfit]); totalsRow = ["TOTAL KESELURUHAN", topSellingItems.reduce((s,i) => s + i.qty, 0), "-", "-", "-", topSellingItems.reduce((s,i) => s + i.totalProfit, 0)];
      allRows = [...rows, totalsRow];
      if (format === 'excel') exportToExcelCSV(filename, headers, allRows); else exportToWord(filename, title, headers, allRows.map(r => [r[0], r[1], r[2] !== "-" ? formatRupiah(r[2]) : "-", r[3] !== "-" ? formatRupiah(r[3]) : "-", r[4] !== "-" ? formatRupiah(r[4]) : "-", r[5] !== "-" ? formatRupiah(r[5]) : "-"]));
    } else if (laporanTab === 'transaksi') {
      title = "Rekapitulasi Transaksi Harian"; filename = `Rekap_Transaksi_${startDate}_sd_${endDate}`; headers = ["Tanggal", "Jumlah Transaksi", "Omset Harian (Rp)", "Profit Harian (Rp)"];
      rows = dailyTrxArray.map(day => [day.date, day.count, day.omset, day.profit]); totalsRow = ["TOTAL KESELURUHAN", dailyTrxArray.reduce((s,i) => s + i.count, 0), dailyTrxArray.reduce((s,i) => s + i.omset, 0), dailyTrxArray.reduce((s,i) => s + i.profit, 0)];
      allRows = [...rows, totalsRow];
      if (format === 'excel') exportToExcelCSV(filename, headers, allRows); else exportToWord(filename, title, headers, allRows.map(r => [r[0], r[1], r[2] !== "-" ? formatRupiah(r[2]) : "-", r[3] !== "-" ? formatRupiah(r[3]) : "-"]));
    }
  };

  const renderFilterPanel = (showSearch = false) => (
    <div className="mb-4 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-start md:items-end justify-between">
      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] md:text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Dari</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-2 py-2 md:px-3 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
          </div>
          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] md:text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Sampai</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-2 py-2 md:px-3 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
          </div>
        </div>
        {showSearch && (
          <div className="w-full md:w-48">
            <label className="block text-[10px] md:text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Search size={12} /> Cari Pemesan</label>
            <input type="text" value={searchTrxQuery} onChange={(e) => setSearchTrxQuery(e.target.value)} placeholder="Nama / Kode BLJ..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
          </div>
        )}
      </div>
      <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
        <button onClick={() => { const d = getLocalDateString(); setStartDate(d); setEndDate(d); }} className="flex-1 md:flex-none px-2 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-100 font-medium">Hari Ini</button>
        <button onClick={() => { const date = new Date(); setStartDate(getLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1))); setEndDate(getLocalDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0))); }} className="flex-1 md:flex-none px-2 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-100 font-medium">Bulan Ini</button>
        <button onClick={() => { setStartDate(""); setEndDate(""); setSearchTrxQuery(""); }} className="flex-1 md:flex-none px-2 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-300 flex items-center justify-center gap-1 font-medium"><Filter size={14}/> Semua</button>
      </div>
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 size={48} className="text-red-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Menghubungkan ke sistem...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-600 p-6 text-center">
            <LogoKoperasi sizeClass="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4" iconSize={40} />
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wide leading-tight">KOPERASI DESA MERAH PUTIH</h1>
          </div>
          
          <form onSubmit={handleLogin} className="p-6 md:p-8 space-y-5 md:space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">Username / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-slate-400" /></div>
                <input type="text" required className="w-full pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Masukkan username..." value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} disabled={isLoggingIn} />
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div>
                <input type="password" required className="w-full pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Masukkan password..." value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} disabled={isLoggingIn} />
              </div>
            </div>

            <button type="submit" disabled={isLoggingIn} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 text-sm md:text-base disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoggingIn ? <><Loader2 size={18} className="animate-spin" /> Memeriksa...</> : 'Masuk Sistem'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 font-sans flex flex-col h-screen overflow-hidden">
      <header className="bg-red-600 text-white shadow-md p-3 md:p-4 shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <LogoKoperasi sizeClass="w-10 h-10 md:w-12 md:h-12" iconSize={24} />
          <div className="flex flex-col justify-center">
            <h1 className="text-sm md:text-xl font-bold tracking-wide leading-tight whitespace-nowrap">KOPERASI DESA MERAH PUTIH</h1>
            <h1 className="text-xs md:text-xl font-medium md:font-bold tracking-wide leading-tight whitespace-nowrap opacity-90 md:opacity-100">SUKASARI KECAMATAN DAWUAN</h1>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex bg-red-700/50 rounded-lg p-1 overflow-x-auto">
            {currentUser.role !== 'backup' && (
              <>
                <button onClick={() => setActiveTab("kasir")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "kasir" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><ShoppingCart size={16} /> Kasir</button>
                <button onClick={() => setActiveTab("transaksi")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "transaksi" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><ListOrdered size={16} /> Transaksi</button>
                <button onClick={() => setActiveTab("laporan")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "laporan" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><BarChart3 size={16} /> Laporan</button>
              </>
            )}
            {currentUser.role === 'admin' && (
              <>
                <button onClick={() => setActiveTab("gudang")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "gudang" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><Package size={16} /> Gudang</button>
                <button onClick={() => setActiveTab("opname")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "opname" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><ClipboardList size={16} /> Opname</button>
              </>
            )}
            {currentUser.role === 'backup' && (
              <button onClick={() => setActiveTab("pengaturan")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "pengaturan" ? "bg-white text-red-600 shadow" : "text-red-100 hover:text-white"}`}><Database size={16} /> Kelola Database</button>
            )}
          </div>
          <div className="flex items-center gap-3 border-l border-red-500 pl-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold">{currentUser.username}</span>
              <span className="text-[10px] bg-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider">{currentUser.role}</span>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-700 rounded-full transition-colors text-red-100 hover:text-white" title="Keluar"><LogOut size={20} /></button>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2">
           <div className="flex flex-col items-end">
             <span className="text-xs font-bold leading-tight">{currentUser.username}</span>
           </div>
           <button onClick={handleLogout} className="p-1.5 bg-red-700/50 rounded-full text-red-100"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        
        {activeTab === "kasir" && (
          <div className="h-full flex w-full max-w-7xl mx-auto md:p-4 gap-4">
            
            <section className="flex-1 bg-white md:rounded-xl md:shadow-sm border-r md:border border-slate-200 flex flex-col h-full overflow-hidden w-full pb-16 md:pb-0 relative z-0">
              
              <div className="p-3 md:p-4 border-b border-slate-100 bg-white shadow-sm z-10 flex gap-2 items-center">
                <div className="relative flex-1">
                  <input type="text" placeholder="Cari barang / kode..." className="w-full pl-9 pr-3 py-2.5 md:py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Search className="absolute left-3 top-3 md:top-2.5 text-slate-400" size={18} />
                </div>
                
                <div className="relative shrink-0">
                  <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} className={`p-2.5 md:p-2 border rounded-lg flex items-center justify-center transition-colors ${selectedCategory !== "Semua" ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'}`} title="Filter Kategori">
                    <Filter size={20} />
                  </button>
                  {showCategoryMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.15)] z-50 p-2 text-left">
                      <div className="text-[10px] font-bold text-slate-400 uppercase px-2 pb-1 mb-1 border-b border-slate-100">Kategori Barang</div>
                      <button onClick={() => { setSelectedCategory("Semua"); setShowCategoryMenu(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm font-medium ${selectedCategory === "Semua" ? 'bg-red-50 text-red-600' : 'text-slate-700 hover:bg-slate-50'}`}>Semua Kategori</button>
                      {[...new Set(products.map(p => p.category))].map(cat => (
                        <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryMenu(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm font-medium ${selectedCategory === cat ? 'bg-red-50 text-red-600' : 'text-slate-700 hover:bg-slate-50'}`}>{cat}</button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="shrink-0 p-2.5 md:p-2 bg-slate-50 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors" title="Ubah Tampilan Daftar">
                  {viewMode === "grid" ? <List size={20} /> : <LayoutGrid size={20} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-slate-50/50 pb-24 md:pb-4">
                <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4" : "flex flex-col gap-2 md:gap-3"}>
                  {filteredProducts.map(product => {
                    const effStock = getEffectiveStock(product);
                    const effPrice = getEffectivePrice(product);
                    const isOutOfStock = effStock <= 0;
                    
                    return viewMode === "grid" ? (
                      <div key={product.id} onClick={() => handleProductClick(product)} className={`bg-white border border-slate-200 rounded-xl md:rounded-2xl p-2.5 md:p-4 transition-all hover:shadow-md active:scale-95 flex flex-col relative group ${isOutOfStock ? 'opacity-50 grayscale' : 'cursor-pointer'}`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[9px] md:text-[10px] font-medium text-slate-500 truncate mr-1 bg-slate-50 px-1.5 rounded">{product.category}</span>
                          <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{product.code}</span>
                        </div>
                        <h3 className="text-xs md:text-sm font-bold text-slate-800 leading-tight mb-2 md:mb-3 flex-1">
                          {product.name}
                          {product.hasVariations && <span className="block text-[9px] font-normal text-indigo-500 mt-0.5">{product.variations.length} Pilihan Variasi</span>}
                          {product.useLinkedStock && <span className="block text-[9px] font-normal text-slate-400 mt-0.5"><Link2 size={10} className="inline"/> Ikut Induk</span>}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-auto gap-1">
                          <span className="text-red-600 font-bold text-sm md:text-base leading-none">
                            {product.hasVariations && <span className="text-[10px] font-normal text-slate-500 block -mb-0.5">Mulai</span>}
                            {formatRupiah(effPrice)}
                          </span>
                          <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-semibold self-start sm:self-auto ${effStock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            Stok: {effStock}
                          </span>
                        </div>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl cursor-not-allowed">
                            <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded shadow">HABIS</span>
                          </div>
                        )}
                        {cart.filter(c => c.id === product.id).length > 0 && (
                           <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                             {cart.filter(c => c.id === product.id).reduce((s, c) => s + c.qty, 0)}
                           </div>
                        )}
                      </div>
                    ) : (
                      <div key={product.id} onClick={() => handleProductClick(product)} className={`bg-white border border-slate-200 rounded-xl p-3 md:p-4 transition-all hover:shadow-md active:scale-[0.98] flex items-center gap-3 relative group ${isOutOfStock ? 'opacity-50 grayscale' : 'cursor-pointer'}`}>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] md:text-[10px] font-medium text-slate-500 truncate bg-slate-50 px-1.5 rounded">{product.category}</span>
                            <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{product.code}</span>
                          </div>
                          <h3 className="text-sm md:text-base font-bold text-slate-800 leading-tight truncate">
                            {product.name}
                            {product.hasVariations && <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">{product.variations.length} Variasi</span>}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span className="text-red-600 font-bold text-sm md:text-base leading-none">
                            {product.hasVariations && <span className="text-[10px] font-normal text-slate-500 mr-1">Mulai</span>}
                            {formatRupiah(effPrice)}
                          </span>
                          <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-semibold ${effStock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            Stok: {effStock}
                          </span>
                        </div>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl cursor-not-allowed">
                            <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow">HABIS</span>
                          </div>
                        )}
                        {cart.filter(c => c.id === product.id).length > 0 && (
                           <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                             {cart.filter(c => c.id === product.id).reduce((s, c) => s + c.qty, 0)}
                           </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
                      <Package size={48} className="mb-3 opacity-20" />
                      <p className="text-sm">Barang tidak ditemukan atau database kosong.</p>
                    </div>
                  )}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="md:hidden fixed bottom-[72px] left-0 right-0 px-4 z-20 pointer-events-none">
                  <button onClick={() => setShowMobileCart(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex justify-between items-center pointer-events-auto transform transition-transform active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-blue-600">{cart.reduce((s, i) => s + i.qty, 0)}</span>
                      </div>
                      <span className="font-semibold text-sm">Lihat Pesanan</span>
                    </div>
                    <div className="font-bold text-lg">{formatRupiah(totalAmount)}</div>
                  </button>
                </div>
              )}
            </section>

            {showMobileCart && (
              <div className="md:hidden fixed inset-0 bg-slate-900/40 z-[50] backdrop-blur-sm transition-opacity" onClick={() => setShowMobileCart(false)}></div>
            )}
            
            <section className={`fixed md:relative inset-x-0 bottom-0 top-12 md:top-0 z-[60] md:z-0 bg-white md:rounded-xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] md:shadow-sm border-t md:border border-slate-200 w-full md:w-96 flex flex-col transition-transform duration-300 ease-in-out transform ${showMobileCart ? 'translate-y-0' : 'translate-y-full md:translate-y-0'} shrink-0 rounded-t-2xl md:rounded-t-xl`}>
              <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl md:rounded-t-xl shrink-0">
                <div className="flex items-center gap-2">
                  <button className="md:hidden p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 shadow-sm" onClick={() => setShowMobileCart(false)}><ChevronDown size={20}/></button>
                  <h2 className="text-base md:text-lg font-semibold text-slate-800 flex items-center gap-2"><ReceiptText size={18} className="text-red-600" /> Daftar Pesanan</h2>
                </div>
                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border border-red-200">{cart.reduce((sum, item) => sum + (item.qty || 0), 0)} Item</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-slate-50/30 pb-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                    <ShoppingCart size={40} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">Belum ada barang dipilih.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.cartItemId} className="flex gap-2 bg-white border border-slate-200 p-2.5 md:p-3 rounded-xl shadow-sm relative">
                      {item.variationId && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pl-1">
                        <h4 className="text-xs md:text-sm font-bold text-slate-800 truncate leading-tight">{item.name}</h4>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                          <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1.5 bg-white text-slate-600 hover:text-red-600 rounded shadow-sm"><Minus size={14} /></button>
                          <input type="number" min="1" max={getEffectiveStock(products.find(p=>p.id===item.id), item.variationId)} value={item.qty} onChange={(e) => handleDirectQuantityChange(item.cartItemId, e.target.value)} onBlur={() => handleQuantityBlur(item.cartItemId)} className="w-10 text-center text-sm font-bold bg-transparent border-none focus:ring-0 p-0" style={{ MozAppearance: 'textfield' }} />
                          <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1.5 bg-white text-slate-600 hover:text-green-600 rounded shadow-sm"><Plus size={14} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="text-[10px] md:text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 bg-red-50 px-2 py-1 rounded"><Trash2 size={12} /> Hapus</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 md:p-4 border-t border-slate-200 bg-white pb-8 md:pb-4 shrink-0 rounded-b-xl">
                {errorMsg && <div className="mb-2 md:mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs flex items-center gap-2"><AlertCircle size={14} className="shrink-0"/> <span className="leading-tight">{errorMsg}</span></div>}
                
                <div className="flex justify-between items-center mb-3"><span className="text-sm text-slate-500 font-semibold">Total Belanja</span><span className="text-xl md:text-2xl font-black text-red-600">{formatRupiah(totalAmount)}</span></div>
                
                <div className="mb-3">
                  <input type="text" placeholder="Nama Pemesan (Kosongkan = Umum)" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => handleAddPayment(-1000)} className="w-12 h-10 md:h-11 bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center shrink-0 active:bg-slate-300"><Minus size={18} /></button>
                    <input type="text" inputMode="numeric" placeholder="Uang Dibayar" className="w-full h-10 md:h-11 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-base font-bold text-center" value={paymentAmount ? "Rp. " + new Intl.NumberFormat('id-ID').format(paymentAmount) : ""} onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                    <button onClick={() => handleAddPayment(1000)} className="w-12 h-10 md:h-11 bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center shrink-0 active:bg-slate-300"><Plus size={18} /></button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                    <button onClick={() => handleAddPayment(10000)} className="py-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 active:bg-red-100">+10K</button>
                    <button onClick={() => handleAddPayment(20000)} className="py-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 active:bg-red-100">+20K</button>
                    <button onClick={() => handleAddPayment(50000)} className="py-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 active:bg-red-100">+50K</button>
                    <button onClick={() => handleAddPayment(100000)} className="py-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 active:bg-red-100">+100K</button>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPaymentAmount(totalAmount.toString())} disabled={totalAmount === 0} className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold disabled:opacity-50">Uang Pas</button>
                    <button onClick={() => setPaymentAmount("")} className="px-4 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold">Reset</button>
                  </div>
                </div>

                <div className={`flex justify-between items-center mb-3 p-2.5 rounded-xl border transition-colors ${totalAmount === 0 && !paymentAmount ? 'bg-slate-50 border-slate-200' : changeAmount < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <span className={`text-xs font-bold ${totalAmount === 0 && !paymentAmount ? 'text-slate-500' : changeAmount < 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {totalAmount === 0 && !paymentAmount ? 'Status Bayar' : changeAmount < 0 ? 'Uang Kurang' : 'Kembalian'}
                  </span>
                  <span className={`text-lg font-black ${totalAmount === 0 && !paymentAmount ? 'text-slate-400' : changeAmount < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {totalAmount === 0 && !paymentAmount ? '-' : formatRupiah(Math.abs(changeAmount))}
                  </span>
                </div>

                <button onClick={handleCheckout} disabled={cart.length === 0} className={`w-full py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-all ${cart.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] active:scale-[0.98]'}`}><CheckCircle2 size={20} /> Proses Pembayaran</button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "transaksi" && (
          <div className="h-full overflow-y-auto p-2 md:p-4 pb-20 md:pb-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 w-full max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
                <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2"><ListOrdered className="text-red-600 w-5 h-5" /> Riwayat Transaksi</h2>
                {currentUser.role === 'admin' && (
                  <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                    <button onClick={() => setViewTrash(false)} className={`flex-1 md:flex-none px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all ${!viewTrash ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Transaksi Aktif</button>
                    <button onClick={() => setViewTrash(true)} className={`flex-1 md:flex-none px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${viewTrash ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}><ArchiveX size={14}/> Dibatalkan</button>
                  </div>
                )}
              </div>

              {renderFilterPanel(true)}
              
              {displaySales.length === 0 ? (
                <div className="text-center py-12 text-slate-500"><ReceiptText size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm md:text-base">{viewTrash ? 'Tidak ada transaksi yang dibatalkan.' : 'Belum ada riwayat transaksi.'}</p></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className={`${viewTrash ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-200 text-slate-600 text-xs md:text-sm`}>
                        <th className="px-3 py-3 md:p-4 font-semibold">ID Transaksi</th>
                        <th className="px-3 py-3 md:p-4 font-semibold">Waktu</th>
                        <th className="px-3 py-3 md:p-4 font-semibold">Pemesan</th>
                        <th className="px-3 py-3 md:p-4 font-semibold text-right">Total</th>
                        <th className="px-3 py-3 md:p-4 font-semibold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displaySales.map((trx) => (
                        <tr key={trx.id} className={`border-b border-slate-100 hover:bg-slate-50 ${viewTrash ? 'opacity-70' : ''}`}>
                          <td className="px-3 py-3 md:p-4 text-xs md:text-sm text-slate-900 font-bold font-mono">#{trx.id.toString().slice(-6)}</td>
                          <td className="px-3 py-3 md:p-4 text-xs md:text-sm text-slate-600">{trx.date.split(' ')[1]} <span className="text-[10px] text-slate-400 block">{trx.date.split(' ')[0]}</span></td>
                          <td className="px-3 py-3 md:p-4 text-xs md:text-sm font-semibold text-slate-800">{trx.customer} {viewTrash && <span className="ml-2 bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">Batal</span>}</td>
                          <td className="px-3 py-3 md:p-4 text-xs md:text-sm font-bold text-slate-800 text-right">{formatRupiah(trx.total)}</td>
                          <td className="px-3 py-3 md:p-4 flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingReceipt(trx)} className="bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"><Eye size={14} /> Nota</button>
                            {!viewTrash ? (
                              <button onClick={() => setTransactionToDelete(trx)} className="bg-red-50 text-red-600 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={14} /> Batal</button>
                            ) : (
                              <>
                                <button onClick={() => setTransactionToRestore(trx)} className="bg-green-50 text-green-700 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><RotateCcw size={14} /> Restore</button>
                                <button onClick={() => setTransactionToPermanentDelete(trx)} className="bg-red-50 text-red-700 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1" title="Hapus Permanen"><Trash2 size={14} /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "laporan" && (
          <div className="h-full overflow-y-auto p-2 md:p-4 pb-20 md:pb-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 w-full max-w-7xl mx-auto">
              <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4"><BarChart3 className="text-red-600 w-5 h-5" /> Ringkasan Penjualan</h2>
              {renderFilterPanel(false)}

              {reportSales.length === 0 ? (
                <div className="text-center py-12 text-slate-500"><BarChart3 size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm md:text-base">Belum ada data penjualan aktif.</p></div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar w-full border-b border-slate-100">
                      <button onClick={() => setLaporanTab('penjualan')} className={`whitespace-nowrap flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors flex items-center gap-1.5 ${laporanTab === 'penjualan' ? 'bg-red-50 text-red-600 border border-red-200' : 'text-slate-500 bg-slate-50'}`}><TrendingUp size={14}/> Penjualan</button>
                      <button onClick={() => setLaporanTab('keuntungan')} className={`whitespace-nowrap flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors flex items-center gap-1.5 ${laporanTab === 'keuntungan' ? 'bg-green-50 text-green-600 border border-green-200' : 'text-slate-500 bg-slate-50'}`}><Activity size={14}/> Keuntungan</button>
                      <button onClick={() => setLaporanTab('transaksi')} className={`whitespace-nowrap flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors flex items-center gap-1.5 ${laporanTab === 'transaksi' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500 bg-slate-50'}`}><ListOrdered size={14}/> Transaksi Harian</button>
                  </div>
                  
                  {laporanTab === 'penjualan' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-sm">
                          <p className="text-red-100 text-xs md:text-sm font-medium mb-0.5">Total Omset Penjualan</p>
                          <h3 className="text-xl md:text-2xl font-black">{formatRupiah(totalRevenue)}</h3>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                          <p className="text-slate-500 text-xs md:text-sm font-medium mb-0.5">Total Barang Terjual</p>
                          <h3 className="text-xl md:text-2xl font-black text-slate-800">{topSellingItems.reduce((sum, item) => sum + item.qty, 0)} <span className="text-sm font-normal text-slate-500">Unit</span></h3>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 md:p-4 border-b border-slate-200 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-sm md:text-base">Rincian Barang Terjual</h3>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDownload('excel')} className="p-1.5 md:px-3 bg-green-100 text-green-700 rounded flex items-center gap-1"><Download size={14}/><span className="hidden md:inline text-xs font-bold">Excel</span></button>
                            <button onClick={() => handleDownload('word')} className="p-1.5 md:px-3 bg-blue-100 text-blue-700 rounded flex items-center gap-1"><FileText size={14}/><span className="hidden md:inline text-xs font-bold">Word</span></button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600 text-[10px] md:text-xs uppercase tracking-wider bg-white">
                                <th className="px-3 py-2.5 md:p-4 font-bold">Nama Barang</th>
                                <th className="px-3 py-2.5 md:p-4 font-bold text-center">Terjual</th>
                                <th className="px-3 py-2.5 md:p-4 font-bold text-right">Penjualan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topSellingItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100 bg-white">
                                  <td className="px-3 py-3 md:p-4 text-xs md:text-sm font-bold text-slate-800">{item.name}</td>
                                  <td className="px-3 py-3 md:p-4 text-xs md:text-sm text-center"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{item.qty}</span></td>
                                  <td className="px-3 py-3 md:p-4 text-xs md:text-sm font-black text-slate-800 text-right">{formatRupiah(item.totalSales)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {laporanTab === 'keuntungan' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-sm">
                        <p className="text-green-100 text-xs font-medium mb-0.5">Total Profit Bersih</p>
                        <h3 className="text-xl md:text-2xl font-black">{formatRupiah(totalProfit)}</h3>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                          <h3 className="font-bold text-slate-800 text-sm">Analisis Margin</h3>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDownload('excel')} className="p-1.5 bg-green-100 text-green-700 rounded"><Download size={14}/></button>
                            <button onClick={() => handleDownload('word')} className="p-1.5 bg-blue-100 text-blue-700 rounded"><FileText size={14}/></button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600 text-[10px] md:text-xs uppercase bg-white">
                                <th className="px-3 py-2 font-bold">Barang</th>
                                <th className="px-3 py-2 font-bold text-center">Jml</th>
                                <th className="px-3 py-2 font-bold text-right">Profit/Unit</th>
                                <th className="px-3 py-2 font-bold text-right text-green-600">Total Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topSellingItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100 bg-white">
                                  <td className="px-3 py-3 text-xs md:text-sm font-bold text-slate-800 truncate max-w-[120px] md:max-w-none">{item.name}</td>
                                  <td className="px-3 py-3 text-xs text-center">{item.qty}</td>
                                  <td className="px-3 py-3 text-xs text-slate-500 text-right">{formatRupiah(item.price - item.buyPrice)}</td>
                                  <td className="px-3 py-3 text-xs font-black text-green-600 text-right">{formatRupiah(item.totalProfit)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {laporanTab === 'transaksi' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 p-4 rounded-xl text-white shadow-sm">
                          <p className="text-slate-300 text-[10px] md:text-xs font-medium mb-0.5">Jml Transaksi</p>
                          <h3 className="text-lg md:text-xl font-black">{totalTransactionsCount}</h3>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                          <p className="text-slate-500 text-[10px] md:text-xs font-medium mb-0.5">Rata-rata/Struk</p>
                          <h3 className="text-lg md:text-xl font-black text-slate-800">{formatRupiah(totalRevenue / (totalTransactionsCount || 1))}</h3>
                        </div>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                          <h3 className="font-bold text-slate-800 text-sm">Rekap Harian</h3>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDownload('excel')} className="p-1.5 bg-green-100 text-green-700 rounded"><Download size={14}/></button>
                            <button onClick={() => handleDownload('word')} className="p-1.5 bg-blue-100 text-blue-700 rounded"><FileText size={14}/></button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600 text-[10px] bg-white">
                                <th className="px-3 py-2 font-bold">Tanggal</th>
                                <th className="px-3 py-2 font-bold text-center">Struk</th>
                                <th className="px-3 py-2 font-bold text-right">Omset</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dailyTrxArray.map((day, idx) => (
                                <tr key={idx} className="border-b border-slate-100 bg-white">
                                  <td className="px-3 py-3 text-xs font-bold text-slate-800">{day.date}</td>
                                  <td className="px-3 py-3 text-xs text-center"><span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{day.count}</span></td>
                                  <td className="px-3 py-3 text-xs font-black text-slate-800 text-right">{formatRupiah(day.omset)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "gudang" && currentUser.role === 'admin' && (
          <div className="h-full overflow-y-auto p-2 md:p-4 pb-20 md:pb-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 w-full max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-red-600 w-5 h-5" /> Manajemen Gudang</h2>
                <button onClick={() => {
                  setNewProduct({ code: '', name: '', buyPrice: '', price: '', stock: '', category: 'Sembako', hasVariations: false, variations: [], useLinkedStock: false, linkedProductId: ''});
                  setShowAddModal(true);
                }} className="w-full md:w-auto bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2"><Plus size={16} /> Tambah Barang</button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4">
                <div className="relative flex-1">
                  <input type="text" placeholder="Cari barang..." className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
                
                <div className="relative shrink-0">
                  <button onClick={() => setShowSortMenu(!showSortMenu)} className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 relative transition-colors hover:bg-slate-50">
                    <ArrowUpDown size={16} /> Urutkan
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-3 text-left">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 p-1 hover:bg-slate-50 rounded">
                          <input type="radio" checked={sortConfig.key === 'name' && sortConfig.direction === 'asc'} onChange={() => { setSortConfig({key: 'name', direction: 'asc'}); setShowSortMenu(false); }} className="w-3.5 h-3.5 text-red-600" /> Nama (A-Z)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 p-1 hover:bg-slate-50 rounded">
                          <input type="radio" checked={sortConfig.key === 'stock' && sortConfig.direction === 'asc'} onChange={() => { setSortConfig({key: 'stock', direction: 'asc'}); setShowSortMenu(false); }} className="w-3.5 h-3.5 text-red-600" /> Stok Menipis
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 p-1 hover:bg-slate-50 rounded">
                          <input type="radio" checked={sortConfig.key === 'createdAt' && sortConfig.direction === 'desc'} onChange={() => { setSortConfig({key: 'createdAt', direction: 'desc'}); setShowSortMenu(false); }} className="w-3.5 h-3.5 text-red-600" /> Terakhir Ditambahkan
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 p-1 hover:bg-slate-50 rounded">
                          <input type="radio" checked={sortConfig.key === 'createdAt' && sortConfig.direction === 'asc'} onChange={() => { setSortConfig({key: 'createdAt', direction: 'asc'}); setShowSortMenu(false); }} className="w-3.5 h-3.5 text-red-600" /> Pertama Ditambahkan
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] md:text-xs">
                      <th className="px-3 py-2 md:p-4 font-bold">Nama & Status</th>
                      <th className="px-3 py-2 md:p-4 font-bold text-right">Harga Jual</th>
                      <th className="px-3 py-2 md:p-4 font-bold text-center">Stok</th>
                      <th className="px-3 py-2 md:p-4 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map(product => {
                      const effStock = getEffectiveStock(product);
                      const effPrice = getEffectivePrice(product);
                      return (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2.5 md:p-4">
                            <div className="font-bold text-xs md:text-sm text-slate-800">{product.name}</div>
                            {product.hasVariations && <div className="text-[10px] text-indigo-500 font-medium mt-0.5"><Layers size={10} className="inline mr-1"/>{product.variations.length} Variasi</div>}
                            {product.useLinkedStock && <div className="text-[10px] text-slate-400 font-medium mt-0.5"><Link2 size={10} className="inline mr-1"/>Ikut Stok Induk</div>}
                            {!product.hasVariations && !product.useLinkedStock && <div className="text-[9px] md:text-xs text-slate-400 font-mono mt-0.5">{product.code}</div>}
                          </td>
                          <td className="px-3 py-2.5 md:p-4 text-xs md:text-sm font-black text-slate-800 text-right">
                            {product.hasVariations && <span className="text-[10px] font-normal text-slate-500 mr-1">Mulai</span>}
                            {formatRupiah(effPrice)}
                          </td>
                          <td className="px-3 py-2.5 md:p-4 text-center">
                            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold ${effStock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{effStock}</span>
                          </td>
                          <td className="px-3 py-2.5 md:p-4 flex justify-center">
                            <button onClick={() => setEditingProduct(product)} className="bg-blue-50 text-blue-600 px-2 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "opname" && currentUser.role === 'admin' && (
          <div className="h-full overflow-y-auto p-2 md:p-4 pb-20 md:pb-4 bg-slate-50">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 w-full max-w-7xl mx-auto">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" /> Stock Opname Bulanan
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Catatan keuangan & fisik barang berdiri sendiri (tidak memotong gudang kasir).</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input type="month" className="flex-1 md:w-auto px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={opnamePeriod} onChange={(e) => setOpnamePeriod(e.target.value)} />
                  <button onClick={() => {
                    const d = new Date();
                    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setOpnameForm({ id: '', date: localDate, itemName: '', prevStock: '', inQty: '', buyPrice: '', outQty: '', sellPrice: '' });
                    setShowOpnameModal(true);
                  }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                    <Plus size={16} /> <span className="hidden md:inline">Tambah Catatan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-start gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0"><TrendingDown size={24} /></div>
                  <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Modal Beli</p><h3 className="text-lg md:text-xl font-black text-slate-800">{formatRupiah(opnameTotalPembelian)}</h3></div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-start gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg shrink-0"><TrendingUp size={24} /></div>
                  <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Omset Keluar</p><h3 className="text-lg md:text-xl font-black text-slate-800">{formatRupiah(opnameTotalOmset)}</h3></div>
                </div>
                <div className={`p-4 rounded-xl shadow-sm flex items-start gap-3 text-white ${opnameTotalLaba >= 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                  <div className="p-2 bg-white/20 rounded-lg shrink-0"><Wallet size={24} /></div>
                  <div><p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Estimasi Laba Kotor</p><h3 className="text-lg md:text-xl font-black">{formatRupiah(opnameTotalLaba)}</h3></div>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] md:text-xs">
                      <th className="px-3 py-3 font-bold">Tanggal</th>
                      <th className="px-3 py-3 font-bold">Nama Barang</th>
                      <th className="px-3 py-3 font-bold text-center">Stok Awal</th>
                      <th className="px-3 py-3 font-bold text-center bg-blue-50/50">Jml Masuk</th>
                      <th className="px-3 py-3 font-bold text-right bg-blue-50/50">Modal/Pcs</th>
                      <th className="px-3 py-3 font-bold text-center bg-green-50/50">Jml Keluar</th>
                      <th className="px-3 py-3 font-bold text-right bg-green-50/50">Jual/Pcs</th>
                      <th className="px-3 py-3 font-bold text-center bg-indigo-50 text-indigo-700">Sisa Akhir</th>
                      <th className="px-3 py-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpnameData.length === 0 ? (
                      <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada catatan opname aktif di bulan ini.</td></tr>
                    ) : (
                      filteredOpnameData.map((item) => {
                        const finalStock = Number(item.prevStock || 0) + Number(item.inQty || 0) - Number(item.outQty || 0);
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 bg-white">
                            <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{item.date}</td>
                            <td className="px-3 py-2.5 text-xs md:text-sm font-bold text-slate-800">{item.itemName}{item.isAuto && <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200" title="Otomatis dari Kasir">Kasir</span>}</td>
                            <td className="px-3 py-2.5 text-xs text-center font-mono text-slate-500">{item.prevStock}</td>
                            <td className="px-3 py-2.5 text-xs text-center font-bold text-blue-600 bg-blue-50/10">+{item.inQty}</td>
                            <td className="px-3 py-2.5 text-xs text-right text-slate-600 bg-blue-50/10">{formatRupiah(item.buyPrice)}</td>
                            <td className="px-3 py-2.5 text-xs text-center font-bold text-green-600 bg-green-50/10">-{item.outQty}</td>
                            <td className="px-3 py-2.5 text-xs text-right text-slate-600 bg-green-50/10">{formatRupiah(item.sellPrice)}</td>
                            <td className="px-3 py-2.5 text-xs md:text-sm text-center font-black text-indigo-600 bg-indigo-50/30">{finalStock}</td>
                            <td className="px-3 py-2.5 flex justify-center gap-1.5">
                              <button onClick={() => { setOpnameForm(item); setShowOpnameModal(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit3 size={14} /></button>
                              <button onClick={() => setOpnameToDelete(item.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pengaturan" && currentUser.role === 'backup' && (
           <div className="h-full overflow-y-auto p-2 md:p-4 pb-20 md:pb-4 bg-slate-50">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-8 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Database size={40} className="text-slate-600" /></div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">Manajemen Database</h2>
               <p className="text-slate-500 text-sm md:text-base mb-8 max-w-lg">Gunakan fitur ini dengan bijak. Lakukan pencadangan (backup) atau pemulihan (restore) data sistem secara menyeluruh.</p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-8 flex flex-col items-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-bl-xl">AMAN</div>
                   <Download size={40} className="text-blue-600 mb-4" />
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Backup Database</h3>
                   <p className="text-xs text-slate-500 mb-6 flex-1">Unduh file <span className="font-mono text-slate-700 bg-slate-200 px-1 rounded">.json</span> berisi seluruh data barang, transaksi, dan opname ke perangkat Anda.</p>
                   <button onClick={handleBackupDatabase} className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex justify-center items-center gap-2">
                     <Download size={18} /> Unduh File Backup
                   </button>
                 </div>

                 <div className="bg-red-50 border border-red-200 rounded-2xl p-5 md:p-8 flex flex-col items-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-red-200 text-red-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl">BAHAYA</div>
                   <Upload size={40} className="text-red-600 mb-4" />
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Restore Database</h3>
                   <p className="text-xs text-slate-500 mb-6 flex-1 text-red-700">Unggah file backup <span className="font-mono text-red-900 bg-red-100 px-1 rounded">.json</span>. <strong className="text-red-800 block mt-1">Peringatan: Data saat ini akan tertimpa!</strong></p>
                   <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                   <button onClick={() => fileInputRef.current?.click()} className="w-full px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex justify-center items-center gap-2">
                     <Upload size={18} /> Unggah & Pulihkan Data
                   </button>
                 </div>
               </div>
             </div>
           </div>
        )}
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe flex overflow-x-auto hide-scrollbar shadow-[0_-4px_10px_rgb(0,0,0,0.05)]">
        {currentUser.role !== 'backup' && (
          <>
            <button onClick={() => { setActiveTab("kasir"); setShowMobileCart(false); }} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 min-w-[70px] flex-1 ${activeTab === "kasir" ? "text-red-600 bg-red-50/50" : "text-slate-400"}`}>
              <ShoppingCart size={20} className={activeTab === "kasir" ? "fill-red-100" : ""} />
              <span className="text-[10px] font-bold mt-1">Kasir</span>
            </button>
            <button onClick={() => setActiveTab("transaksi")} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 min-w-[70px] flex-1 ${activeTab === "transaksi" ? "text-red-600 bg-red-50/50" : "text-slate-400"}`}>
              <ListOrdered size={20} />
              <span className="text-[10px] font-bold mt-1">Transaksi</span>
            </button>
            <button onClick={() => setActiveTab("laporan")} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 min-w-[70px] flex-1 ${activeTab === "laporan" ? "text-red-600 bg-red-50/50" : "text-slate-400"}`}>
              <BarChart3 size={20} />
              <span className="text-[10px] font-bold mt-1">Laporan</span>
            </button>
          </>
        )}
        {currentUser.role === 'admin' && (
          <>
            <button onClick={() => setActiveTab("gudang")} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 min-w-[70px] flex-1 ${activeTab === "gudang" ? "text-red-600 bg-red-50/50" : "text-slate-400"}`}>
              <Package size={20} />
              <span className="text-[10px] font-bold mt-1">Gudang</span>
            </button>
            <button onClick={() => setActiveTab("opname")} className={`flex-shrink-0 flex flex-col items-center justify-center py-2 min-w-[70px] flex-1 ${activeTab === "opname" ? "text-indigo-600 bg-indigo-50/50" : "text-slate-400"}`}>
              <ClipboardList size={20} />
              <span className="text-[10px] font-bold mt-1">Opname</span>
            </button>
          </>
        )}
      </nav>

      {selectedProductForVariation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[70] animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:fade-in">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Pilih Variasi</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProductForVariation.name}</p>
              </div>
              <button onClick={() => setSelectedProductForVariation(null)} className="bg-white border border-slate-200 p-1.5 rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-2">
              {selectedProductForVariation.variations.map((v) => (
                <button 
                  key={v.id} 
                  onClick={() => { addToCart(selectedProductForVariation, v); setSelectedProductForVariation(null); }}
                  disabled={v.stock <= 0}
                  className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all ${v.stock <= 0 ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-red-400 hover:bg-red-50 shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="text-left">
                    <span className="block text-sm font-bold text-slate-800">{v.name}</span>
                    <span className="block text-xs text-slate-500 font-mono mt-0.5">{v.code || '-'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-black text-red-600">{formatRupiah(v.price)}</span>
                    <span className={`block text-[10px] font-semibold mt-0.5 ${v.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{v.stock > 0 ? `Stok: ${v.stock}` : 'HABIS'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddModal && currentUser.role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2"><Package size={18} className="text-red-600" /> Tambah Barang</h3>
              <button onClick={() => setShowAddModal(false)} className="bg-slate-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-4 md:p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang Lengkap</label>
                <input type="text" required className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Misal: Rokok Gudang Garam" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    <option>Sembako</option><option>Makanan</option><option>Minuman</option><option>Kebutuhan</option><option>Lainnya</option>
                  </select>
                </div>
                {!newProduct.hasVariations && !newProduct.useLinkedStock && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kode Barang</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 uppercase text-sm" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value.toUpperCase()})} placeholder="BRG-000" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${newProduct.hasVariations ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-100'}`}>
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={newProduct.hasVariations} onChange={(e) => setNewProduct({...newProduct, hasVariations: e.target.checked, useLinkedStock: false})} />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Gunakan Variasi Barang</span>
                    <span className="block text-[10px] text-slate-500">Punya ukuran/warna berbeda dengan harga/stok terpisah.</span>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${newProduct.useLinkedStock ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-100'}`}>
                  <input type="checkbox" className="w-4 h-4 text-orange-600 rounded" checked={newProduct.useLinkedStock} onChange={(e) => setNewProduct({...newProduct, useLinkedStock: e.target.checked, hasVariations: false})} />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Konek Stok ke Barang Lain</span>
                    <span className="block text-[10px] text-slate-500">Stok barang ini akan memotong stok barang induk yang dipilih.</span>
                  </div>
                </label>
              </div>

              {newProduct.hasVariations && (
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-3 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Daftar Variasi</h4>
                    <button type="button" onClick={() => addVariationField(true)} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-bold">+ Tambah</button>
                  </div>
                  {newProduct.variations.map((v, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm relative">
                      <button type="button" onClick={() => removeVariationField(index, true)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full"><X size={12}/></button>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><label className="block text-[10px] font-medium text-slate-500">Nama Variasi (Wajib)</label><input type="text" required className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-500" placeholder="Misal: Ukuran L" value={v.name} onChange={e => handleVariationChange(index, 'name', e.target.value, true)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Kode (Opsional)</label><input type="text" className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-500 uppercase" placeholder="KODE" value={v.code} onChange={e => handleVariationChange(index, 'code', e.target.value.toUpperCase(), true)} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><label className="block text-[10px] font-medium text-slate-500">Hrg Beli</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.buyPrice} onChange={e => handleVariationChange(index, 'buyPrice', e.target.value, true)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Hrg Jual (Wajib)</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.price} onChange={e => handleVariationChange(index, 'price', e.target.value, true)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Stok (Wajib)</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.stock} onChange={e => handleVariationChange(index, 'stock', e.target.value, true)} /></div>
                      </div>
                    </div>
                  ))}
                  {newProduct.variations.length === 0 && <div className="text-center text-xs text-indigo-400 py-2 font-medium">Belum ada variasi. Klik tambah di atas.</div>}
                </div>
              )}

              {newProduct.useLinkedStock && (
                <div className="border border-orange-200 bg-orange-50/30 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">Pilih Barang Induk</h4>
                  <select required className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm bg-white" value={newProduct.linkedProductId} onChange={e => setNewProduct({...newProduct, linkedProductId: e.target.value})}>
                    <option value="" disabled>-- Pilih Barang yang Mengontrol Stok --</option>
                    {products.filter(p => !p.useLinkedStock).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stok Saat Ini: {p.stock})</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><label className="block text-[10px] font-medium text-slate-500">Hrg Beli Barang Ini (Opsional)</label><input type="number" className="w-full px-2 py-2 border rounded text-xs" value={newProduct.buyPrice} onChange={e => setNewProduct({...newProduct, buyPrice: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-medium text-slate-500">Hrg Jual Barang Ini (Wajib)</label><input type="number" required className="w-full px-2 py-2 border rounded text-xs" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                  </div>
                </div>
              )}

              {!newProduct.hasVariations && !newProduct.useLinkedStock && (
                <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Hrg Beli (Rp)</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={newProduct.buyPrice} onChange={e => setNewProduct({...newProduct, buyPrice: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Hrg Jual (Rp)</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Stok Fisik</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} /></div>
                </div>
              )}

              <div className="pt-3 flex gap-2 shrink-0">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 md:py-2.5 bg-slate-100 font-bold rounded-lg text-sm text-slate-600">Batal</button>
                <button type="submit" className="flex-1 py-3 md:py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm shadow-md">Simpan Barang</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && currentUser.role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50 shrink-0">
              <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2"><Edit3 size={18} className="text-blue-600" /> Edit Barang</h3>
              <button onClick={() => setEditingProduct(null)} className="bg-white p-1.5 rounded-full"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleUpdateProduct} className="p-4 md:p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang Lengkap</label>
                <input type="text" required className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                    <option>Sembako</option><option>Makanan</option><option>Minuman</option><option>Kebutuhan</option><option>Lainnya</option>
                  </select>
                </div>
                {!editingProduct.hasVariations && !editingProduct.useLinkedStock && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kode Barang</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase text-sm" value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value.toUpperCase()})} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${editingProduct.hasVariations ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-100'}`}>
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={editingProduct.hasVariations || false} onChange={(e) => setEditingProduct({...editingProduct, hasVariations: e.target.checked, useLinkedStock: false, variations: editingProduct.variations || []})} />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Gunakan Variasi Barang</span>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${editingProduct.useLinkedStock ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-100'}`}>
                  <input type="checkbox" className="w-4 h-4 text-orange-600 rounded" checked={editingProduct.useLinkedStock || false} onChange={(e) => setEditingProduct({...editingProduct, useLinkedStock: e.target.checked, hasVariations: false})} />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Konek Stok ke Barang Lain</span>
                  </div>
                </label>
              </div>

              {editingProduct.hasVariations && (
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-3 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Daftar Variasi</h4>
                    <button type="button" onClick={() => addVariationField(false)} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-bold">+ Tambah</button>
                  </div>
                  {(editingProduct.variations || []).map((v, index) => (
                    <div key={v.id || index} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm relative">
                      <button type="button" onClick={() => removeVariationField(index, false)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full"><X size={12}/></button>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><label className="block text-[10px] font-medium text-slate-500">Nama Variasi</label><input type="text" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.name} onChange={e => handleVariationChange(index, 'name', e.target.value, false)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Kode</label><input type="text" className="w-full px-2 py-1.5 border rounded text-xs uppercase" value={v.code || ''} onChange={e => handleVariationChange(index, 'code', e.target.value.toUpperCase(), false)} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><label className="block text-[10px] font-medium text-slate-500">Hrg Beli</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.buyPrice} onChange={e => handleVariationChange(index, 'buyPrice', e.target.value, false)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Hrg Jual</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.price} onChange={e => handleVariationChange(index, 'price', e.target.value, false)} /></div>
                        <div><label className="block text-[10px] font-medium text-slate-500">Stok</label><input type="number" required className="w-full px-2 py-1.5 border rounded text-xs" value={v.stock} onChange={e => handleVariationChange(index, 'stock', e.target.value, false)} /></div>
                      </div>
                    </div>
                  ))}
                  {(!editingProduct.variations || editingProduct.variations.length === 0) && <div className="text-center text-xs text-indigo-400 py-2 font-medium">Belum ada variasi. Klik tambah di atas.</div>}
                </div>
              )}

              {editingProduct.useLinkedStock && (
                <div className="border border-orange-200 bg-orange-50/30 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">Pilih Barang Induk</h4>
                  <select required className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white" value={editingProduct.linkedProductId || ''} onChange={e => setEditingProduct({...editingProduct, linkedProductId: e.target.value})}>
                    <option value="" disabled>-- Pilih Barang yang Mengontrol Stok --</option>
                    {products.filter(p => p.id !== editingProduct.id && !p.useLinkedStock).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stok Saat Ini: {p.stock})</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><label className="block text-[10px] font-medium text-slate-500">Hrg Beli Barang Ini (Opsional)</label><input type="number" className="w-full px-2 py-2 border rounded text-xs" value={editingProduct.buyPrice} onChange={e => setEditingProduct({...editingProduct, buyPrice: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-medium text-slate-500">Hrg Jual Barang Ini (Wajib)</label><input type="number" required className="w-full px-2 py-2 border rounded text-xs" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} /></div>
                  </div>
                </div>
              )}

              {!editingProduct.hasVariations && !editingProduct.useLinkedStock && (
                <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Hrg Beli (Rp)</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={editingProduct.buyPrice} onChange={e => setEditingProduct({...editingProduct, buyPrice: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Hrg Jual (Rp)</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Stok Fisik</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} /></div>
                </div>
              )}

              <div className="pt-3 flex gap-2 shrink-0">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 md:py-2.5 bg-slate-100 font-bold rounded-lg text-sm text-slate-600">Batal</button>
                <button type="submit" className="flex-1 py-3 md:py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-md">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOpnameModal && currentUser.role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
              <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={18} className="text-indigo-600" /> {opnameForm.id ? 'Edit Catatan Opname' : 'Tambah Catatan Opname'}</h3>
              <button onClick={() => setShowOpnameModal(false)} className="bg-white p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveOpname} className="p-4 md:p-5 flex flex-col gap-4 overflow-y-auto">
              {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs">{errorMsg}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                  <input type="date" required className="w-full px-3 py-2 border rounded-lg text-sm" value={opnameForm.date} onChange={e => setOpnameForm({...opnameForm, date: e.target.value})} disabled={opnameForm.isAuto} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Barang</label>
                  {opnameForm.isAuto ? (
                    <input type="text" readOnly className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100" value={opnameForm.itemName} />
                  ) : (
                    <select required className="w-full px-3 py-2 border rounded-lg text-sm" onChange={handleOpnameProductSelect} value={products.find(p => p.name === opnameForm.itemName)?.id || ''}>
                      <option value="" disabled>-- Pilih Barang dari Gudang --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {!opnameForm.isAuto && !products.find(p => p.name === opnameForm.itemName) && opnameForm.itemName && (
                 <div className="col-span-2">
                   <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang (Manual)</label>
                   <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={opnameForm.itemName} onChange={e => setOpnameForm({...opnameForm, itemName: e.target.value})} />
                 </div>
              )}

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><label className="block text-[10px] font-medium text-slate-700 mb-1">Stok Awal</label><input type="number" required className="w-full px-2 py-2 border rounded-lg text-xs" value={opnameForm.prevStock} onChange={e => setOpnameForm({...opnameForm, prevStock: e.target.value})} disabled={opnameForm.isAuto} /></div>
                <div><label className="block text-[10px] font-medium text-slate-700 mb-1 text-blue-600">Jml Masuk (+)</label><input type="number" className="w-full px-2 py-2 border rounded-lg text-xs border-blue-200" value={opnameForm.inQty} onChange={e => setOpnameForm({...opnameForm, inQty: e.target.value})} disabled={opnameForm.isAuto} /></div>
                <div><label className="block text-[10px] font-medium text-slate-700 mb-1 text-green-600">Jml Keluar (-)</label><input type="number" className="w-full px-2 py-2 border rounded-lg text-xs border-green-200" value={opnameForm.outQty} onChange={e => setOpnameForm({...opnameForm, outQty: e.target.value})} disabled={opnameForm.isAuto} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Harga Modal/Pcs</label><input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={opnameForm.buyPrice} onChange={e => setOpnameForm({...opnameForm, buyPrice: e.target.value})} disabled={opnameForm.isAuto} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Harga Jual/Pcs</label><input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={opnameForm.sellPrice} onChange={e => setOpnameForm({...opnameForm, sellPrice: e.target.value})} disabled={opnameForm.isAuto} /></div>
              </div>

              {opnameForm.isAuto && <p className="text-[10px] text-red-500 italic">*Data dari sistem kasir hanya bisa diedit sebagian atau dihapus (meskipun tidak disarankan).</p>}

              <div className="pt-3 flex gap-2 shrink-0">
                <button type="button" onClick={() => setShowOpnameModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-sm text-slate-600">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg text-sm shadow-md">Simpan Catatan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {opnameToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 size={28} /></div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Hapus Catatan?</h3>
            <p className="text-slate-500 text-xs mb-5">Catatan opname ini akan dihapus permanen dari daftar tabel.</p>
            <div className="flex gap-2">
              <button onClick={() => setOpnameToDelete(null)} className="flex-1 py-2 bg-slate-100 font-bold rounded-lg text-xs text-slate-700">Batal</button>
              <button onClick={executeDeleteOpname} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg text-xs">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {(showReceipt || viewingReceipt) && (() => {
        const data = showReceipt ? receiptData : viewingReceipt;
        const isCheckout = showReceipt;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[90] animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
              <button onClick={() => isCheckout ? setShowReceipt(false) : setViewingReceipt(null)} className="absolute top-4 right-4 text-slate-400 bg-slate-100 p-1.5 rounded-full z-10"><X size={18} /></button>
              <div className="p-5 md:p-6 overflow-y-auto">
                <div className="text-center mb-5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${isCheckout ? 'bg-green-100 text-green-600' : data.status === 'deleted' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    {isCheckout ? <CheckCircle2 size={28} /> : data.status === 'deleted' ? <ArchiveX size={28} /> : <ReceiptText size={28} />}
                  </div>
                  <h3 className="text-lg font-black text-slate-800">{isCheckout ? 'Pembayaran Berhasil' : data.status === 'deleted' ? 'Nota Dibatalkan' : 'Salinan Nota'}</h3>
                  <p className="text-slate-500 text-[11px] mt-1">{data.date}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5 font-mono">ID: #{data.id.toString().slice(-6)} | Kasir: {data.cashier || '-'}</p>
                </div>
                <div className="border-t border-b border-dashed border-slate-300 py-3 mb-3 relative">
                  {data.status === 'deleted' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
                      <span className="text-4xl font-black text-red-600 -rotate-12 border-4 border-red-600 px-4 py-1">DIBATALKAN</span>
                    </div>
                  )}
                  <p className="font-bold text-center text-slate-800 text-xs mb-3">KOPERASI DESA MERAH PUTIH</p>
                  <div className="space-y-1.5 relative z-10">
                    {data.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-slate-600">{item.name} x{item.qty}</span>
                        <span className="text-slate-800 font-bold">{formatRupiah(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-black text-slate-800 text-sm"><span>Total</span><span>{formatRupiah(data.total)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Tunai</span><span>{formatRupiah(data.payment)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Kembali</span><span>{formatRupiah(data.change)}</span></div>
                </div>
                
                <div className="mt-6 space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => downloadReceiptJPG(data)} className="flex-1 py-2.5 font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 flex justify-center items-center gap-2 text-sm transition-colors"><ImageIcon size={16} /> Unduh JPG</button>
                    <button onClick={() => shareReceipt(data)} className="flex-1 py-2.5 font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 flex justify-center items-center gap-2 text-sm transition-colors"><Share2 size={16} /> Bagikan Nota</button>
                  </div>
                  <button onClick={() => isCheckout ? setShowReceipt(false) : setViewingReceipt(null)} className={`w-full py-2.5 font-bold rounded-xl text-sm ${isCheckout ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-red-600 text-white hover:bg-red-700'} transition-colors`}>
                    {isCheckout ? 'Tutup & Transaksi Baru' : 'Tutup Salinan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {transactionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3"><AlertCircle size={28} /></div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Batalkan Transaksi?</h3>
            <p className="text-slate-500 text-xs mb-5">Stok barang (induk maupun variasi) akan otomatis dikembalikan ke sistem.</p>
            <div className="flex gap-2">
              <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-2 bg-slate-100 font-bold rounded-lg text-xs text-slate-700">Kembali</button>
              <button onClick={confirmDeleteTransaction} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg text-xs">Ya, Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {transactionToPermanentDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 size={28} /></div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Hapus Permanen?</h3>
            <p className="text-slate-500 text-xs mb-5">Transaksi ini akan hilang dari sistem selamanya dan tidak dapat dikembalikan lagi. Stok barang tidak akan terpengaruh.</p>
            <div className="flex gap-2">
              <button onClick={() => setTransactionToPermanentDelete(null)} className="flex-1 py-2 bg-slate-100 font-bold rounded-lg text-xs text-slate-700">Batal</button>
              <button onClick={confirmPermanentDeleteTransaction} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg text-xs">Hapus Permanen</button>
            </div>
          </div>
        </div>
      )}

      {transactionToRestore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center">
            <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3"><RotateCcw size={28} /></div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Kembalikan Transaksi?</h3>
            <p className="text-slate-500 text-[11px] mb-3 leading-tight">Transaksi ini akan dikembalikan ke sistem aktif. Pastikan stok barang masih mencukupi.</p>
            {errorMsg && <div className="mb-3 text-[10px] text-red-600 bg-red-50 p-2 rounded text-left font-medium">{errorMsg}</div>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setTransactionToRestore(null); setErrorMsg(""); }} className="flex-1 py-2 bg-slate-100 font-bold rounded-lg text-xs text-slate-700">Tutup</button>
              <button onClick={confirmRestoreTransaction} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg text-xs hover:bg-green-700">Restore Data</button>
            </div>
          </div>
        </div>
      )}

      {systemMsg.text && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl p-5 text-center max-w-xs w-full animate-in zoom-in-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${systemMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {systemMsg.type === 'error' ? <AlertCircle size={24} /> : <Check size={24} />}
            </div>
            <h3 className={`text-lg font-black mb-1 ${systemMsg.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
              {systemMsg.type === 'error' ? 'Gagal' : 'Berhasil'}
            </h3>
            <p className="text-slate-600 text-sm mb-5">{systemMsg.text}</p>
            <button onClick={() => setSystemMsg({ type: '', text: '' })} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-sm transition-colors">OK Mengerti</button>
          </div>
        </div>
      )}

    </div>
  );
}
