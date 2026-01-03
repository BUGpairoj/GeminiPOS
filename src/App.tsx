import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  Settings, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  CupSoda, 
  TrendingUp, 
  Receipt, 
  X, 
  Check, 
  DollarSign, 
  Menu as MenuIcon,
  LogOut,
  History,
  Edit,
  Save,
  Sparkles,
  MessageSquare,
  Copy,
  Key
} from 'lucide-react';

// --- Types & Interfaces (Simulating Prisma Models) ---
type Category = 'smoothie' | 'soda' | 'topping';

interface Product {
  id: number;
  name: string;
  price: number;
  category: Category;
  color: string; // For UI visualization
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  received: number;
  change: number;
  timestamp: Date;
  paymentMethod: 'cash' | 'qrcode';
}

// --- Mock Data (Initial Database) ---
const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'แตงโมปั่น (Watermelon)', price: 40, category: 'smoothie', color: 'from-red-400 to-red-600' },
  { id: 2, name: 'มะม่วงปั่น (Mango)', price: 50, category: 'smoothie', color: 'from-yellow-300 to-yellow-500' },
  { id: 3, name: 'สตรอว์เบอร์รีโยเกิร์ต', price: 60, category: 'smoothie', color: 'from-pink-400 to-rose-600' },
  { id: 4, name: 'ส้มปั่น (Orange)', price: 45, category: 'smoothie', color: 'from-orange-400 to-orange-600' },
  { id: 5, name: 'บลูเบอร์รี่ชีสพาย', price: 65, category: 'smoothie', color: 'from-blue-500 to-purple-600' },
  { id: 6, name: 'กีวี่ปั่น (Kiwi)', price: 50, category: 'smoothie', color: 'from-lime-400 to-green-600' },
  { id: 7, name: 'แดงมะนาวโซดา', price: 35, category: 'soda', color: 'from-red-500 to-orange-400' },
  { id: 8, name: 'ลิ้นจี่โซดา', price: 35, category: 'soda', color: 'from-pink-300 to-pink-500' },
  { id: 9, name: 'วิปครีม (Topping)', price: 15, category: 'topping', color: 'from-slate-100 to-slate-300' },
];

// --- Utility Components ---

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'ai'; 
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 shadow-orange-200',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    success: 'bg-green-500 text-white hover:bg-green-600 shadow-green-200',
    ai: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-purple-200 hover:opacity-90',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Gemini API Handler ---
const callGeminiAPI = async (prompt: string, apiKey: string) => {
  if (!apiKey) throw new Error("Please enter API Key");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
};

// --- Main Application ---

export default function App() {
  // State Management
  const [view, setView] = useState<'pos' | 'admin'>('pos');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Gemini & AI State
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
  // AI Barista State
  const [showAIBarista, setShowAIBarista] = useState(false);
  const [aiBaristaPrompt, setAiBaristaPrompt] = useState('');
  const [aiBaristaResult, setAiBaristaResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AI Marketing State
  const [showAIMarketing, setShowAIMarketing] = useState(false);
  const [selectedProductForAd, setSelectedProductForAd] = useState<Product | null>(null);
  const [aiMarketingResult, setAiMarketingResult] = useState('');

  // Derived State
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const filteredProducts = products.filter(p => 
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Handlers ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const processPayment = () => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < cartTotal) return;

    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      total: cartTotal,
      received: received,
      change: received - cartTotal,
      timestamp: new Date(),
      paymentMethod: 'cash'
    };

    setOrders([newOrder, ...orders]);
    setLastOrder(newOrder);
    setCart([]);
    setCashReceived('');
    setIsPaymentModalOpen(false);
  };

  // AI Handlers
  const handleAIBarista = async () => {
    if (!aiBaristaPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const prompt = `
        You are an expert mixologist at a smoothie shop. 
        Customer request: "${aiBaristaPrompt}".
        Available ingredients context: Mango, Watermelon, Strawberry, Yogurt, Orange, Blueberry, Kiwi, Soda.
        
        Please suggest a creative smoothie drink name and a short description in Thai language.
        Format: "🥤 [ชื่อเมนู] \n\nส่วนผสม: [ส่วนผสม] \n\nคำบรรยาย: [คำบรรยายสั้นๆชวนดื่ม]"
        Keep it fun and refreshing!
      `;
      const result = await callGeminiAPI(prompt, apiKey);
      setAiBaristaResult(result);
    } catch (error) {
      setAiBaristaResult(`Error: ${error instanceof Error ? error.message : "Something went wrong"}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAIMarketing = async (product: Product) => {
    setIsAiLoading(true);
    setAiMarketingResult('');
    setSelectedProductForAd(product);
    setShowAIMarketing(true);
    
    try {
      const prompt = `
        Act as a social media marketing expert.
        Write a catchy, viral Facebook/Instagram post in Thai to promote this smoothie: "${product.name}".
        Price: ${product.price} THB.
        Mood: Refreshing, Delicious, Healthy.
        Use many emojis. Include hashtags.
      `;
      const result = await callGeminiAPI(prompt, apiKey);
      setAiMarketingResult(result);
    } catch (error) {
      setAiMarketingResult(`Error: ${error instanceof Error ? error.message : "Something went wrong"}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Components ---

  const Sidebar = () => (
    <div className="hidden md:flex flex-col w-24 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 z-20 items-center py-8 gap-8">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-200">
        <CupSoda className="text-white w-6 h-6" />
      </div>
      
      <div className="flex flex-col gap-4 w-full px-4">
        <button 
          onClick={() => setView('pos')}
          className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${view === 'pos' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-medium">ขาย</span>
        </button>

        <button 
          onClick={() => setView('admin')}
          className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${view === 'admin' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-[10px] font-medium">จัดการ</span>
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-4 px-4 w-full">
        <button 
           onClick={() => setShowApiKeyModal(true)}
           className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${apiKey ? 'text-green-500 bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
           title="API Settings"
        >
          <Key className="w-6 h-6" />
        </button>
        <button className="p-3 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );

  const ProductGrid = () => (
    <div className="flex-1 p-6 md:p-8 bg-slate-50/50 overflow-y-auto h-screen md:pl-32 pb-32 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-prompt">เลือกเมนูผลไม้</h1>
          <p className="text-slate-500 text-sm">สดชื่น อร่อย สุขภาพดี 🌿</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {/* AI Barista Button */}
          <Button 
            variant="ai" 
            onClick={() => setShowAIBarista(true)} 
            className="whitespace-nowrap shadow-lg shadow-purple-100"
          >
            <Sparkles className="w-4 h-4" /> AI Barista
          </Button>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาเมนู..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: 'ทั้งหมด', icon: <LayoutGrid className="w-4 h-4" /> },
          { id: 'smoothie', label: 'สมูทตี้', icon: <CupSoda className="w-4 h-4" /> },
          { id: 'soda', label: 'โซดา', icon: <CupSoda className="w-4 h-4" /> },
          { id: 'topping', label: 'ท็อปปิ้ง', icon: <Plus className="w-4 h-4" /> },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as Category | 'all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
              selectedCategory === cat.id 
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredProducts.map(product => (
          <div 
            key={product.id}
            onClick={() => addToCart(product)}
            className="group relative bg-white rounded-2xl p-3 border border-slate-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${product.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`} />
            
            <div className={`h-32 rounded-xl bg-gradient-to-br ${product.color} mb-3 flex items-center justify-center shadow-inner relative`}>
              <CupSoda className="text-white w-12 h-12 drop-shadow-md transform group-hover:-rotate-12 transition-transform duration-300" />
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                ฿{product.price}
              </div>
            </div>
            
            <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1">{product.name}</h3>
            <p className="text-xs text-slate-400 capitalize">{product.category}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const CartPanel = () => (
    <div className="w-full md:w-96 bg-white border-l border-slate-100 h-screen flex flex-col fixed right-0 top-0 z-30 shadow-2xl md:shadow-none">
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            รายการสั่งซื้อ
          </h2>
          <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold">
            #{orders.length + 1}
          </span>
        </div>
        <p className="text-xs text-slate-400">สมาชิก: ทั่วไป (Guest)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
            <ShoppingCart className="w-16 h-16 opacity-20" />
            <p className="font-light">ยังไม่มีรายการ</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex gap-3 bg-slate-50 p-3 rounded-xl group animate-in slide-in-from-right-4 duration-300">
               <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                 <CupSoda className="w-5 h-5 text-white" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start">
                   <h4 className="font-medium text-slate-700 text-sm truncate">{item.name}</h4>
                   <p className="font-bold text-slate-800 text-sm">฿{item.price * item.quantity}</p>
                 </div>
                 <div className="flex items-center gap-3 mt-2">
                   <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                     <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><Minus className="w-3 h-3" /></button>
                     <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><Plus className="w-3 h-3" /></button>
                   </div>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-slate-500">
            <span>จำนวน ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            <span>฿{cartTotal}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>ภาษี (7%)</span>
            <span>฿{(cartTotal * 0.07).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-200">
            <span>ยอดสุทธิ</span>
            <span className="text-orange-600">฿{cartTotal}</span>
          </div>
        </div>

        <Button 
          variant="primary" 
          className="w-full py-4 text-lg shadow-lg shadow-orange-200"
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={cart.length === 0}
        >
          ชำระเงิน
        </Button>
      </div>
    </div>
  );

  const AdminDashboard = () => (
    <div className="flex-1 p-6 md:p-8 bg-slate-50 h-screen md:pl-32 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
           <p className="text-slate-500">ภาพรวมยอดขายและการจัดการ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setView('pos')}>
            <LogOut className="w-4 h-4" /> กลับหน้าร้าน
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">ยอดขายวันนี้</p>
            <h3 className="text-2xl font-bold text-slate-800">
              ฿{orders.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
            </h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">จำนวนออเดอร์</p>
            <h3 className="text-2xl font-bold text-slate-800">{orders.length}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-orange-500">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
             <CupSoda className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">เมนูยอดฮิต</p>
            <h3 className="text-lg font-bold text-slate-800">แตงโมปั่น</h3>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" /> AI Marketing Assistant
          </h3>
        </div>
        <div className="p-4 bg-purple-50/50">
          <h4 className="text-sm font-medium text-slate-600 mb-3">สร้างแคปชั่นโปรโมทสินค้าด้วย AI</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             {products.map(p => (
               <button 
                 key={p.id}
                 onClick={() => handleAIMarketing(p)}
                 className="bg-white p-2 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-left group"
               >
                 <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} mb-2 flex items-center justify-center`}>
                    <CupSoda className="w-4 h-4 text-white" />
                 </div>
                 <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                 <div className="mt-1 text-[10px] text-purple-500 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                   <Sparkles className="w-3 h-3" /> สร้างโพสต์
                 </div>
               </button>
             ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4" /> ประวัติการขายล่าสุด
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-4">รหัส</th>
                <th className="p-4">เวลา</th>
                <th className="p-4">รายการ</th>
                <th className="p-4 text-right">ยอดเงิน</th>
                <th className="p-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">ยังไม่มีข้อมูลการขาย</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-xs">{order.id}</td>
                    <td className="p-4">{order.timestamp.toLocaleTimeString('th-TH')}</td>
                    <td className="p-4 text-slate-600 truncate max-w-[200px]">
                      {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </td>
                    <td className="p-4 text-right font-bold">฿{order.total}</td>
                    <td className="p-4 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">สำเร็จ</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // --- Modals ---

  const ApiKeyModal = () => {
    if (!showApiKeyModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md p-6 relative">
          <button onClick={() => setShowApiKeyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-4 text-purple-600">
            <Key className="w-6 h-6" />
            <h3 className="font-bold text-lg">Gemini API Key</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            กรุณาใส่ API Key ของคุณเพื่อเปิดใช้งานฟีเจอร์ AI (Key จะไม่ถูกบันทึกลง Server)
          </p>
          <input 
            type="password"
            className="w-full px-4 py-2 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-purple-200 focus:outline-none"
            placeholder="Paste your API key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button variant="primary" className="w-full" onClick={() => setShowApiKeyModal(false)}>
            บันทึก
          </Button>
        </Card>
      </div>
    );
  }

  const AIBaristaModal = () => {
    if (!showAIBarista) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
        <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white relative">
            <button onClick={() => setShowAIBarista(false)} className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-lg">AI Barista</h3>
            </div>
            <p className="text-white/80 text-sm">บอกความต้องการของคุณ ให้ AI แนะนำเมนูสุดพิเศษ!</p>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {!aiBaristaResult ? (
              <>
                 <label className="text-sm font-medium text-slate-700 mb-2 block">ลูกค้าต้องการดื่มแบบไหน?</label>
                 <textarea 
                   className="w-full p-4 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-purple-200 focus:outline-none h-32 resize-none"
                   placeholder="เช่น ขอสดชื่นๆ แก้ร้อน, หรือ เครื่องดื่มสีชมพูที่ไม่หวานมาก..."
                   value={aiBaristaPrompt}
                   onChange={(e) => setAiBaristaPrompt(e.target.value)}
                 />
                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                   {['สดชื่นแก้ร้อน', 'หวานน้อยไม่อ้วน', 'ผลไม้รวมปั่น', 'แก้เมาค้าง'].map(tag => (
                     <button 
                       key={tag}
                       onClick={() => setAiBaristaPrompt(tag)}
                       className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100 whitespace-nowrap"
                     >
                       {tag}
                     </button>
                   ))}
                 </div>
                 <Button 
                   variant="ai" 
                   className="w-full py-3"
                   onClick={handleAIBarista}
                   disabled={isAiLoading || !aiBaristaPrompt}
                 >
                   {isAiLoading ? 'กำลังคิดสูตร...' : '✨ แนะนำเมนู'}
                 </Button>
              </>
            ) : (
              <div className="animate-in slide-in-from-bottom-4">
                 <div className="bg-purple-50 rounded-xl p-6 mb-6 border border-purple-100">
                    <pre className="whitespace-pre-wrap font-prompt text-slate-700 text-sm leading-relaxed">
                      {aiBaristaResult}
                    </pre>
                 </div>
                 <Button variant="secondary" className="w-full" onClick={() => setAiBaristaResult('')}>
                   ลองอีกครั้ง
                 </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const AIMarketingModal = () => {
    if (!showAIMarketing) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
        <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
             <h3 className="font-bold flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-purple-400" />
               AI Content Generator
             </h3>
             <button onClick={() => setShowAIMarketing(false)} className="text-slate-400 hover:text-white">
               <X className="w-5 h-5" />
             </button>
          </div>
          <div className="p-6">
             <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedProductForAd?.color} flex items-center justify-center shadow-lg`}>
                   <CupSoda className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Promoting</p>
                  <h2 className="text-xl font-bold text-slate-800">{selectedProductForAd?.name}</h2>
                  <p className="text-purple-600 font-bold">฿{selectedProductForAd?.price}</p>
                </div>
             </div>

             {isAiLoading ? (
               <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-3">
                 <Sparkles className="w-8 h-8 animate-spin text-purple-500" />
                 <p className="animate-pulse">กำลังเขียนแคปชั่นสุดปัง...</p>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                   {aiMarketingResult}
                 </div>
                 <div className="flex gap-3">
                   <Button variant="secondary" className="flex-1" onClick={() => navigator.clipboard.writeText(aiMarketingResult)}>
                     <Copy className="w-4 h-4" /> คัดลอก
                   </Button>
                   <Button variant="primary" className="flex-1" onClick={() => handleAIMarketing(selectedProductForAd!)}>
                     <Sparkles className="w-4 h-4" /> เขียนใหม่
                   </Button>
                 </div>
               </div>
             )}
          </div>
        </Card>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!isPaymentModalOpen) return null;
    const change = parseFloat(cashReceived) - cartTotal;
    const canPay = !isNaN(parseFloat(cashReceived)) && parseFloat(cashReceived) >= cartTotal;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <Card className="w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">ชำระเงิน</h3>
            <button onClick={() => setIsPaymentModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-slate-500 mb-1">ยอดชำระทั้งหมด</p>
              <h2 className="text-4xl font-bold text-orange-600">฿{cartTotal}</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">รับเงินมา (Cash Received)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000].map(amt => (
                <button 
                  key={amt}
                  onClick={() => setCashReceived(amt.toString())}
                  className="py-2 bg-slate-100 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-200"
                >
                  ฿{amt}
                </button>
              ))}
              <button 
                onClick={() => setCashReceived(cartTotal.toString())}
                className="py-2 bg-orange-100 rounded-lg text-orange-600 text-sm font-medium hover:bg-orange-200"
              >
                พอดี
              </button>
            </div>

            {canPay && (
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-green-700 font-medium">เงินทอน</span>
                <span className="text-2xl font-bold text-green-700">฿{change.toFixed(2)}</span>
              </div>
            )}

            <Button 
              variant="success" 
              className="w-full py-3 text-lg"
              onClick={processPayment}
              disabled={!canPay}
            >
              ยืนยันการชำระเงิน
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const ReceiptModal = () => {
    if (!lastOrder) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <Card className="w-full max-w-sm bg-white overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-pink-500" />
          
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">ชำระเงินสำเร็จ</h2>
            <p className="text-slate-400 text-sm mb-6">{lastOrder.timestamp.toLocaleString('th-TH')}</p>

            <div className="w-full border-t border-b border-dashed border-slate-200 py-4 mb-4 space-y-2">
              {lastOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.name} x{item.quantity}</span>
                  <span className="font-medium text-slate-800">฿{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="w-full space-y-2 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ยอดรวม</span>
                <span className="font-bold text-slate-800">฿{lastOrder.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">รับเงิน</span>
                <span className="text-slate-800">฿{lastOrder.received}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-orange-600">
                <span>เงินทอน</span>
                <span>฿{lastOrder.change}</span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
                <Receipt className="w-4 h-4" /> พิมพ์
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setLastOrder(null)}>
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
          
          {/* Decorative jagged edge bottom */}
          <div className="h-4 bg-slate-50 w-full relative" 
               style={{ 
                 maskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 10px, black 11px)', 
                 maskSize: '20px 20px', 
                 maskRepeat: 'repeat-x',
                 bottom: -10 
               }} 
          />
        </Card>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-100 font-prompt text-slate-800 flex overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-prompt { font-family: 'Prompt', sans-serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: absolute; left: 0; top: 0; }
        }
      `}</style>

      {/* Mobile Nav Overlay */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-40 flex justify-around">
        <button onClick={() => setView('pos')} className={`flex flex-col items-center ${view === 'pos' ? 'text-orange-600' : 'text-slate-400'}`}>
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px]">เมนู</span>
        </button>
        <div className="relative -top-8">
           <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200 border-4 border-slate-100">
             <span className="font-bold text-lg">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
           </div>
        </div>
        <button onClick={() => setView('admin')} className={`flex flex-col items-center ${view === 'admin' ? 'text-orange-600' : 'text-slate-400'}`}>
          <Settings className="w-6 h-6" />
          <span className="text-[10px]">ระบบ</span>
        </button>
      </div>

      <Sidebar />
      
      {view === 'pos' ? (
        <>
          <ProductGrid />
          <CartPanel />
        </>
      ) : (
        <AdminDashboard />
      )}

      <ApiKeyModal />
      <AIBaristaModal />
      <AIMarketingModal />
      <PaymentModal />
      <ReceiptModal />
      
    </div>
  );
}