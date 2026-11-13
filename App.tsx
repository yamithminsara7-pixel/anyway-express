import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Truck,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Bell,
  DollarSign,
  TrendingUp,
  AlertCircle,
  UserPlus,
  LogOut,
  Search,
  ChevronRight,
  Sparkles,
  Navigation,
  Box,
  CreditCard,
  Banknote,
  Edit3,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

const INITIAL_RIDERS = [
  { id: 'RDR-01', name: 'Kasun Perera', phone: '077 452 8891', town: 'Colombo', vehicle: 'Bike - WP BBD-4512', active: true },
  { id: 'RDR-02', name: 'Nuwan Silva', phone: '071 893 2210', town: 'Horana', vehicle: 'Bike - WP BCK-9021', active: true },
  { id: 'RDR-03', name: 'Dilshan Fernando', phone: '076 319 7745', town: 'Kandy', vehicle: 'Three-Wheeler - WP ABX-3319', active: true }
];

const INITIAL_ORDERS = [];
const STATUS_STEPS = ['Pending', 'Picked Up', 'In Transit', 'Dropped'];

export default function App() {
  const [entryRole, setEntryRole] = useState(null);
  const [activePortal, setActivePortal] = useState('customer');
  const [riders, setRiders] = useState(INITIAL_RIDERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [pricing, setPricing] = useState({ normalRate: 350, speedExtra: 200, riderCommissionPercent: 30, codFeePercent: 2 });
  const [customerForm, setCustomerForm] = useState({ customerName: '', pickupAddress: '', deliveryAddress: '', itemDescription: '', speed: 'Normal', paymentMethod: 'Paid' });
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [riderIdInput, setRiderIdInput] = useState('');
  const [loggedInRiderId, setLoggedInRiderId] = useState(null);
  const [riderLoginError, setRiderLoginError] = useState('');
  const [inboxPopupOrder, setInboxPopupOrder] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [riderEditForm, setRiderEditForm] = useState({ pickupAddress: '', deliveryAddress: '', itemDescription: '' });
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [tempPricing, setTempPricing] = useState(pricing);
  const [ratesSavedToast, setRatesSavedToast] = useState(false);
  const [deviceAdminBypass, setDeviceAdminBypass] = useState(false);
  const [newRiderForm, setNewRiderForm] = useState({ id: '', name: '', phone: '', town: '', vehicle: '' });
  const [riderFormError, setRiderFormError] = useState('');
  const [adminNotifications, setAdminNotifications] = useState([]);

  useEffect(() => { setTempPricing(pricing); }, [pricing]);

  useEffect(() => {
    if (entryRole === 'rider' && activePortal === 'rider' && loggedInRiderId) {
      const unackOrder = orders.find((o) => o.riderId === loggedInRiderId && !o.acknowledged);
      setInboxPopupOrder(unackOrder || null);
    } else {
      setInboxPopupOrder(null);
    }
  }, [entryRole, activePortal, loggedInRiderId, orders]);

  const getDynamicRiderCommission = (order) => {
    const subtotal = (Number(order.basePrice) || 0) + (Number(order.speedCharge) || 0);
    return Math.round((subtotal * (Number(pricing.riderCommissionPercent) || 0)) / 100);
  };

  const calculatedOrderQuote = useMemo(() => {
    const base = Number(pricing.normalRate) || 0;
    const speedCost = customerForm.speed === 'Speed' ? Number(pricing.speedExtra) || 0 : 0;
    const subtotal = base + speedCost;
    const codCommission = customerForm.paymentMethod === 'COD' ? Math.round((subtotal * pricing.codFeePercent) / 100) : 0;
    const total = subtotal + codCommission;
    const riderComm = Math.round((subtotal * pricing.riderCommissionPercent) / 100);
    return { base, speedCost, subtotal, codCommission, total, riderComm };
  }, [customerForm.speed, customerForm.paymentMethod, pricing]);

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!customerForm.customerName.trim() || !customerForm.pickupAddress.trim() || !customerForm.deliveryAddress.trim()) return;

    const pickupLower = customerForm.pickupAddress.trim().toLowerCase();
    const deliveryLower = customerForm.deliveryAddress.trim().toLowerCase();

    let assignedRider = riders.find((r) => r.town && (pickupLower.includes(r.town.trim().toLowerCase()) || deliveryLower.includes(r.town.trim().toLowerCase())));
    if (!assignedRider && riders.length > 0) assignedRider = riders[orders.length % riders.length];

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newOrder = {
      id: `AWX-${1041 + orders.length}`,
      customerName: customerForm.customerName.trim(),
      pickupAddress: customerForm.pickupAddress.trim(),
      deliveryAddress: customerForm.deliveryAddress.trim(),
      itemDescription: customerForm.itemDescription.trim() || 'Standard Parcel',
      speed: customerForm.speed,
      paymentMethod: customerForm.paymentMethod,
      basePrice: calculatedOrderQuote.base,
      speedCharge: calculatedOrderQuote.speedCost,
      codFee: calculatedOrderQuote.codCommission,
      totalAmount: calculatedOrderQuote.total,
      riderCommission: calculatedOrderQuote.riderComm,
      status: 'Pending',
      riderId: assignedRider ? assignedRider.id : 'UNASSIGNED',
      createdAt: formattedTime,
      acknowledged: false
    };

    setOrders((prev) => [newOrder, ...prev]);
    setOrderSuccessModal({ order: newOrder, rider: assignedRider });
    setCustomerForm({ customerName: '', pickupAddress: '', deliveryAddress: '', itemDescription: '', speed: 'Normal', paymentMethod: 'Paid' });
  };

  const handleAcknowledgeInboxOrder = (orderId) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, acknowledged: true } : o)));
    setInboxPopupOrder(null);
  };

  const handleStartRiderEdit = (job) => {
    setEditingOrderId(job.id);
    setRiderEditForm({ pickupAddress: job.pickupAddress, deliveryAddress: job.deliveryAddress, itemDescription: job.itemDescription });
  };

  const handleSaveRiderEdit = (orderId, markAsPickedUp = false) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const updatedPickup = riderEditForm.pickupAddress.trim() || targetOrder?.pickupAddress || '';
    const updatedDelivery = riderEditForm.deliveryAddress.trim() || targetOrder?.deliveryAddress || '';
    const updatedItem = riderEditForm.itemDescription.trim() || targetOrder?.itemDescription || '';

    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, pickupAddress: updatedPickup, deliveryAddress: updatedDelivery, itemDescription: updatedItem, status: markAsPickedUp ? 'Picked Up' : o.status, acknowledged: true } : o));
    if (markAsPickedUp && targetOrder && targetOrder.status !== 'Picked Up') {
      const riderObj = riders.find(r => r.id === targetOrder.riderId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAdminNotifications((prev) => [{ id: `${orderId}-${Date.now()}`, orderId: targetOrder.id, riderName: riderObj ? riderObj.name : targetOrder.riderId, riderId: targetOrder.riderId, town: riderObj?.town || updatedPickup, pickupAddress: updatedPickup, time: timeStr, read: false }, ...prev]);
    }
    setEditingOrderId(null);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus, acknowledged: true } : o));
    if (newStatus === 'Picked Up' && targetOrder) {
      handleStartRiderEdit(targetOrder);
      const riderObj = riders.find(r => r.id === targetOrder.riderId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAdminNotifications((prev) => [{ id: `${orderId}-${Date.now()}`, orderId: targetOrder.id, riderName: riderObj ? riderObj.name : targetOrder.riderId, riderId: targetOrder.riderId, town: riderObj?.town || targetOrder.pickupAddress, pickupAddress: targetOrder.pickupAddress, time: timeStr, read: false }, ...prev]);
    }
  };

  const handleRiderLogin = (e) => {
    e.preventDefault();
    const cleanedId = riderIdInput.trim().toUpperCase();
    const matchedRider = riders.find((r) => r.id.toUpperCase() === cleanedId);
    if (!matchedRider) {
      setRiderLoginError('Invalid Rider ID. Please enter a registered ANYWAY EXPRESS Rider ID.');
      return;
    }
    setLoggedInRiderId(matchedRider.id);
    setRiderLoginError('');
    setRiderIdInput('');
  };

  const handleAdminUnlock = (e) => {
    e.preventDefault();
    const secret = ['\u0040', 'Y', '2007', '1210'].join('');
    if (adminCodeInput === secret) {
      setAdminUnlocked(true);
      setDeviceAdminBypass(true);
      setAdminAuthError('');
      setAdminCodeInput('');
    } else {
      setAdminAuthError('Access Denied: Incorrect security code.');
    }
  };

  const handleSaveRates = (e) => {
    e.preventDefault();
    const updatedNormal = Math.max(0, Number(tempPricing.normalRate) || 0);
    const updatedSpeed = Math.max(0, Number(tempPricing.speedExtra) || 0);
    const updatedCommPercent = Math.min(100, Math.max(0, Number(tempPricing.riderCommissionPercent) || 0));

    setPricing({ normalRate: updatedNormal, speedExtra: updatedSpeed, riderCommissionPercent: updatedCommPercent, codFeePercent: 2 });
    setOrders((prev) => prev.map((ord) => {
      const subtotal = (Number(ord.basePrice) || 0) + (Number(ord.speedCharge) || 0);
      return { ...ord, riderCommission: Math.round((subtotal * updatedCommPercent) / 100) };
    }));
    setRatesSavedToast(true);
    setTimeout(() => setRatesSavedToast(false), 3000);
  };

  const handleAddRider = (e) => {
    e.preventDefault();
    const idClean = newRiderForm.id.trim().toUpperCase();
    if (!idClean || !newRiderForm.name.trim() || !newRiderForm.phone.trim() || !newRiderForm.town.trim()) {
      setRiderFormError('Rider ID, Name, Phone, and Town are required.');
      return;
    }
    if (riders.some((r) => r.id.toUpperCase() === idClean)) {
      setRiderFormError('This Rider ID already exists.');
      return;
    }
    setRiders((prev) => [...prev, { id: idClean, name: newRiderForm.name.trim(), phone: newRiderForm.phone.trim(), town: newRiderForm.town.trim(), vehicle: newRiderForm.vehicle.trim() || 'Courier Bike', active: true }]);
    setNewRiderForm({ id: '', name: '', phone: '', town: '', vehicle: '' });
    setRiderFormError('');
  };

  const currentRider = useMemo(() => riders.find((r) => r.id === loggedInRiderId) || null, [riders, loggedInRiderId]);
  const riderOrders = useMemo(() => orders.filter((o) => o.riderId === loggedInRiderId), [orders, loggedInRiderId]);

  const riderStats = useMemo(() => {
    const totalJobs = riderOrders.length;
    const droppedCount = riderOrders.filter((o) => o.status === 'Dropped').length;
    const holdCount = riderOrders.filter((o) => o.status === 'Hold').length;
    const totalCommission = riderOrders.filter((o) => o.status !== 'Hold').reduce((acc, o) => acc + getDynamicRiderCommission(o), 0);
    return { totalJobs, droppedCount, holdCount, totalCommission };
  }, [riderOrders, pricing.riderCommissionPercent]);

  const adminStats = useMemo(() => {
    const totalOrders = orders.length;
    const droppedOrders = orders.filter((o) => o.status === 'Dropped').length;
    const holdOrders = orders.filter((o) => o.status === 'Hold').length;
    const validOrders = orders.filter((o) => o.status !== 'Hold');
    const grossRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalRiderCommissions = validOrders.reduce((sum, o) => sum + getDynamicRiderCommission(o), 0);
    const netAdminProfit = grossRevenue - totalRiderCommissions;
    return { totalOrders, droppedOrders, holdOrders, grossRevenue, totalRiderCommissions, netAdminProfit };
  }, [orders, pricing.riderCommissionPercent]);

  const filteredCustomerOrders = useMemo(() => {
    if (!customerSearch.trim()) return orders;
    const q = customerSearch.toLowerCase();
    return orders.filter((o) => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.deliveryAddress.toLowerCase().includes(q));
  }, [orders, customerSearch]);

  if (!entryRole) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 text-center shadow-xl border">
          <Truck className="w-12 h-12 text-sky-600 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-slate-900">ANYWAY EXPRESS</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Select your portal to continue.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => { setEntryRole('admin'); setActivePortal('admin'); }} className="p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border text-left font-bold text-purple-900">Admin Portal</button>
            <button onClick={() => { setEntryRole('customer'); setActivePortal('customer'); }} className="p-4 rounded-2xl bg-sky-50 hover:bg-sky-100 border text-left font-bold text-sky-900">Customer</button>
            <button onClick={() => { setEntryRole('rider'); setActivePortal('rider'); }} className="p-4 rounded-2xl bg-teal-50 hover:bg-teal-100 border text-left font-bold text-teal-900">Rider Partner</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="font-extrabold text-lg text-sky-700">ANYWAY EXPRESS</div>
        <button onClick={() => { setEntryRole(null); setLoggedInRiderId(null); setAdminUnlocked(false); }} className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-bold">Switch Role</button>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activePortal === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border shadow-sm">
              <h2 className="text-lg font-bold mb-4">Send a Parcel</h2>
              <form onSubmit={handlePlaceOrder} className="space-y-3">
                <input type="text" required placeholder="Sender Name" value={customerForm.customerName} onChange={e => setCustomerForm({...customerForm, customerName: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" />
                <input type="text" required placeholder="Pickup Address" value={customerForm.pickupAddress} onChange={e => setCustomerForm({...customerForm, pickupAddress: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" />
                <input type="text" required placeholder="Delivery Address" value={customerForm.deliveryAddress} onChange={e => setCustomerForm({...customerForm, deliveryAddress: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" />
                <input type="text" placeholder="Item Description" value={customerForm.itemDescription} onChange={e => setCustomerForm({...customerForm, itemDescription: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={customerForm.speed} onChange={e => setCustomerForm({...customerForm, speed: e.target.value})} className="border p-2.5 rounded-xl text-sm bg-white">
                    <option value="Normal">Normal (Rs.{pricing.normalRate})</option>
                    <option value="Speed">Speed (+Rs.{pricing.speedExtra})</option>
                  </select>
                  <select value={customerForm.paymentMethod} onChange={e => setCustomerForm({...customerForm, paymentMethod: e.target.value})} className="border p-2.5 rounded-xl text-sm bg-white">
                    <option value="Paid">Paid</option>
                    <option value="COD">COD (2%)</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl font-bold text-sm flex justify-between">
                  <span>Total:</span>
                  <span className="text-sky-700">Rs. {calculatedOrderQuote.total}</span>
                </div>
                <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl">Place Order</button>
              </form>
            </div>
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border shadow-sm">
              <h2 className="text-lg font-bold mb-4">Order History</h2>
              {filteredCustomerOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No orders yet.</div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomerOrders.map(o => (
                    <div key={o.id} className="border p-4 rounded-2xl bg-slate-50 space-y-2">
                      <div className="flex justify-between font-bold text-sm">
                        <span>{o.id}</span>
                        <span className="text-emerald-600">{o.status}</span>
                      </div>
                      <div className="text-xs text-slate-600">To: {o.deliveryAddress} | Total: Rs.{o.totalAmount}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activePortal === 'rider' && (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-3xl border shadow-sm">
            {!loggedInRiderId ? (
              <form onSubmit={handleRiderLogin} className="space-y-4 text-center">
                <h2 className="text-xl font-bold">Rider Login</h2>
                <input type="password" placeholder="Enter Rider ID" value={riderIdInput} onChange={e => setRiderIdInput(e.target.value)} className="w-full border p-3 rounded-xl text-center font-bold" />
                {riderLoginError && <div className="text-rose-600 text-xs">{riderLoginError}</div>}
                <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl">Login</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="font-bold text-lg">Rider Dashboard</h2>
                  <button onClick={() => setLoggedInRiderId(null)} className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-lg font-bold">Logout</button>
                </div>
                <div className="space-y-3">
                  {riderOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No assigned orders.</div>
                  ) : (
                    riderOrders.map(job => (
                      <div key={job.id} className="border p-4 rounded-2xl bg-slate-50 space-y-2">
                        <div className="flex justify-between font-bold text-sm">
                          <span>{job.id}</span>
                          <span className="text-teal-700">{job.status}</span>
                        </div>
                        <div className="text-xs text-slate-600">Drop: {job.deliveryAddress}</div>
                        <div className="flex gap-1 pt-2">
                          {['Picked Up', 'In Transit', 'Dropped', 'Hold'].map(st => (
                            <button key={st} onClick={() => handleUpdateOrderStatus(job.id, st)} className="flex-1 py-1.5 bg-white border rounded-lg text-[10px] font-bold">{st}</button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activePortal === 'admin' && (
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
            {!adminUnlocked ? (
              <form onSubmit={handleAdminUnlock} className="max-w-md mx-auto space-y-4 text-center">
                <h2 className="text-xl font-bold">Admin Portal Lock</h2>
                <input type="password" placeholder="Enter Passcode" value={adminCodeInput} onChange={e => setAdminCodeInput(e.target.value)} className="w-full border p-3 rounded-xl text-center font-bold" />
                {adminAuthError && <div className="text-rose-600 text-xs">{adminAuthError}</div>}
                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl">Unlock</button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-xl font-bold">Admin Command Center</h2>
                  <button onClick={() => setAdminUnlocked(false)} className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-lg font-bold">Lock</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border font-bold">Total Orders: {adminStats.totalOrders}</div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border font-bold text-emerald-800">Net Profit: Rs.{adminStats.netAdminProfit}</div>
                  <div className="p-4 bg-amber-50 rounded-2xl border font-bold text-amber-800">Commissions: Rs.{adminStats.totalRiderCommissions}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      {orderSuccessModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
            <h3 className="text-lg font-bold">Order Placed Successfully!</h3>
            <button onClick={() => setOrderSuccessModal(null)} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
