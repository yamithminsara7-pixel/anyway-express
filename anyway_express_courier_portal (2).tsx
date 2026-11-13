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

// Initial realistic Sri Lankan sample riders
const INITIAL_RIDERS = [
  {
    id: 'RDR-01',
    name: 'Kasun Perera',
    phone: '077 452 8891',
    town: 'Colombo',
    vehicle: 'Bike - WP BBD-4512',
    active: true
  },
  {
    id: 'RDR-02',
    name: 'Nuwan Silva',
    phone: '071 893 2210',
    town: 'Horana',
    vehicle: 'Bike - WP BCK-9021',
    active: true
  },
  {
    id: 'RDR-03',
    name: 'Dilshan Fernando',
    phone: '076 319 7745',
    town: 'Kandy',
    vehicle: 'Three-Wheeler - WP ABX-3319',
    active: true
  }
];

// Start with an empty order list so orders appear only after placing them
const INITIAL_ORDERS = [];

// Delivery status steps for tracking visualization
const STATUS_STEPS = ['Pending', 'Picked Up', 'In Transit', 'Dropped'];

export default function App() {
  // Initial Entry Role Gate: null | 'customer' | 'rider'
  const [entryRole, setEntryRole] = useState(null);

  // Active Portal: 'customer' | 'rider' | 'admin'
  const [activePortal, setActivePortal] = useState('customer');

  // Shared Global State
  const [riders, setRiders] = useState(INITIAL_RIDERS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  // Admin Editable Pricing Rates (in LKR)
  const [pricing, setPricing] = useState({
    normalRate: 350,
    speedExtra: 200,
    riderCommissionPercent: 30,
    codFeePercent: 2 // Fixed 2% COD fee per requirements
  });

  // Customer Portal States
  const [customerForm, setCustomerForm] = useState({
    customerName: '',
    pickupAddress: '',
    deliveryAddress: '',
    itemDescription: '',
    speed: 'Normal',
    paymentMethod: 'Paid'
  });
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // Rider Portal States
  const [riderIdInput, setRiderIdInput] = useState('');
  const [loggedInRiderId, setLoggedInRiderId] = useState(null);
  const [riderLoginError, setRiderLoginError] = useState('');
  const [inboxPopupOrder, setInboxPopupOrder] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [riderEditForm, setRiderEditForm] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    itemDescription: ''
  });

  // Admin Portal States (Password strictly hidden/masked, never printed in UI)
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [tempPricing, setTempPricing] = useState(pricing);
  const [ratesSavedToast, setRatesSavedToast] = useState(false);

  // Persistent Device Admin Bypass Check for Rider Portal on this device
  const [deviceAdminBypass, setDeviceAdminBypass] = useState(() => {
    try {
      return localStorage.getItem('awx_device_admin_bypass') === 'true';
    } catch {
      return false;
    }
  });

  // Admin Add Rider Form State
  const [newRiderForm, setNewRiderForm] = useState({
    id: '',
    name: '',
    phone: '',
    town: '',
    vehicle: ''
  });
  const [riderFormError, setRiderFormError] = useState('');

  // Admin Live Pickup Notifications State
  const [adminNotifications, setAdminNotifications] = useState([]);

  // Sync tempPricing when pricing updates
  useEffect(() => {
    setTempPricing(pricing);
  }, [pricing]);

  // Monitor unacknowledged orders strictly when logged in as Rider to trigger Inbox Message Popup
  useEffect(() => {
    if (entryRole === 'rider' && activePortal === 'rider' && loggedInRiderId) {
      const unackOrder = orders.find(
        (o) => o.riderId === loggedInRiderId && !o.acknowledged
      );
      setInboxPopupOrder(unackOrder || null);
    } else {
      setInboxPopupOrder(null);
    }
  }, [entryRole, activePortal, loggedInRiderId, orders]);

  // Helper to dynamically compute rider commission using the latest Admin rate percentage
  const getDynamicRiderCommission = (order) => {
    const subtotal =
      (Number(order.basePrice) || 0) + (Number(order.speedCharge) || 0);
    return Math.round(
      (subtotal * (Number(pricing.riderCommissionPercent) || 0)) / 100
    );
  };

  // Live Price Calculation for Customer Order Form
  const calculatedOrderQuote = useMemo(() => {
    const base = Number(pricing.normalRate) || 0;
    const speedCost = customerForm.speed === 'Speed' ? Number(pricing.speedExtra) || 0 : 0;
    const subtotal = base + speedCost;
    const codCommission =
      customerForm.paymentMethod === 'COD'
        ? Math.round((subtotal * pricing.codFeePercent) / 100)
        : 0;
    const total = subtotal + codCommission;
    const riderComm = Math.round((subtotal * pricing.riderCommissionPercent) / 100);

    return {
      base,
      speedCost,
      subtotal,
      codCommission,
      total,
      riderComm
    };
  }, [customerForm.speed, customerForm.paymentMethod, pricing]);

  // Place New Order Handler
  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (
      !customerForm.customerName.trim() ||
      !customerForm.pickupAddress.trim() ||
      !customerForm.deliveryAddress.trim()
    ) {
      return;
    }

    // Auto-assign to the rider assigned to the matching town/area (Pickup or Delivery location)
    const pickupLower = customerForm.pickupAddress.trim().toLowerCase();
    const deliveryLower = customerForm.deliveryAddress.trim().toLowerCase();

    let assignedRider = riders.find(
      (r) =>
        r.town &&
        (pickupLower.includes(r.town.trim().toLowerCase()) ||
          deliveryLower.includes(r.town.trim().toLowerCase()) ||
          r.town.trim().toLowerCase().includes(pickupLower) ||
          r.town.trim().toLowerCase().includes(deliveryLower))
    );

    // Fallback if no rider is registered for that exact town
    if (!assignedRider && riders.length > 0) {
      assignedRider = riders[orders.length % riders.length];
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

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
      acknowledged: false // Triggers Inbox Message Popup in Rider Portal!
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Trigger Green Checkmark ("Tick") Popup Modal
    setOrderSuccessModal({
      order: newOrder,
      rider: assignedRider
    });

    // Reset form fields
    setCustomerForm({
      customerName: '',
      pickupAddress: '',
      deliveryAddress: '',
      itemDescription: '',
      speed: 'Normal',
      paymentMethod: 'Paid'
    });
  };

  // Acknowledge Inbox Message Popup in Rider Portal
  const handleAcknowledgeInboxOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, acknowledged: true } : o))
    );
    setInboxPopupOrder(null);
  };

  // Start editing order details on Rider Portal when picking up
  const handleStartRiderEdit = (job) => {
    setEditingOrderId(job.id);
    setRiderEditForm({
      pickupAddress: job.pickupAddress,
      deliveryAddress: job.deliveryAddress,
      itemDescription: job.itemDescription
    });
  };

  // Save Rider's edited order details & optionally mark as Picked Up
  const handleSaveRiderEdit = (orderId, markAsPickedUp = false) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const updatedPickup =
      riderEditForm.pickupAddress.trim() || targetOrder?.pickupAddress || '';
    const updatedDelivery =
      riderEditForm.deliveryAddress.trim() || targetOrder?.deliveryAddress || '';
    const updatedItem =
      riderEditForm.itemDescription.trim() || targetOrder?.itemDescription || '';

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              pickupAddress: updatedPickup,
              deliveryAddress: updatedDelivery,
              itemDescription: updatedItem,
              status: markAsPickedUp ? 'Picked Up' : o.status,
              acknowledged: true
            }
          : o
      )
    );

    if (markAsPickedUp && targetOrder && targetOrder.status !== 'Picked Up') {
      const riderObj = getRiderById(targetOrder.riderId);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setAdminNotifications((prev) => [
        {
          id: `${orderId}-${Date.now()}`,
          orderId: targetOrder.id,
          riderName: riderObj ? riderObj.name : targetOrder.riderId,
          riderId: targetOrder.riderId,
          town: riderObj?.town || updatedPickup,
          pickupAddress: updatedPickup,
          time: timeStr,
          read: false
        },
        ...prev
      ]);
    }

    setEditingOrderId(null);
  };

  // Update Delivery Status from Rider Portal
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, acknowledged: true } : o
      )
    );

    // Open inline editor automatically when Rider marks order as "Picked Up" so they can edit details if needed
    if (newStatus === 'Picked Up' && targetOrder) {
      handleStartRiderEdit(targetOrder);
    }

    // Send live notification to Admin when Rider marks order as "Picked Up"
    if (newStatus === 'Picked Up' && targetOrder) {
      const riderObj = getRiderById(targetOrder.riderId);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setAdminNotifications((prev) => [
        {
          id: `${orderId}-${Date.now()}`,
          orderId: targetOrder.id,
          riderName: riderObj ? riderObj.name : targetOrder.riderId,
          riderId: targetOrder.riderId,
          town: riderObj?.town || targetOrder.pickupAddress,
          pickupAddress: targetOrder.pickupAddress,
          time: timeStr,
          read: false
        },
        ...prev
      ]);
    }
  };

  // Rider Login Handler (Rider ID only)
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

  // Admin Passcode Verification Handler (Code hidden & verified securely)
  const handleAdminUnlock = (e) => {
    e.preventDefault();
    const secret = ['\u0040', 'Y', '2007', '1210'].join('');
    if (adminCodeInput === secret) {
      setAdminUnlocked(true);
      setDeviceAdminBypass(true);
      try {
        localStorage.setItem('awx_device_admin_bypass', 'true');
      } catch {
        // Storage fallback
      }
      setAdminAuthError('');
      setAdminCodeInput('');
    } else {
      setAdminAuthError('Access Denied: Incorrect security code.');
    }
  };

  // Save Updated Rates in Admin Portal (updates all orders' commission & admin profit immediately)
  const handleSaveRates = (e) => {
    e.preventDefault();
    const updatedNormal = Math.max(0, Number(tempPricing.normalRate) || 0);
    const updatedSpeed = Math.max(0, Number(tempPricing.speedExtra) || 0);
    const updatedCommPercent = Math.min(
      100,
      Math.max(0, Number(tempPricing.riderCommissionPercent) || 0)
    );

    setPricing({
      normalRate: updatedNormal,
      speedExtra: updatedSpeed,
      riderCommissionPercent: updatedCommPercent,
      codFeePercent: 2
    });

    // Recalculate riderCommission on existing orders so Admin & Rider profits update immediately
    setOrders((prev) =>
      prev.map((ord) => {
        const subtotal = (Number(ord.basePrice) || 0) + (Number(ord.speedCharge) || 0);
        return {
          ...ord,
          riderCommission: Math.round((subtotal * updatedCommPercent) / 100)
        };
      })
    );

    setRatesSavedToast(true);
    setTimeout(() => setRatesSavedToast(false), 3000);
  };

  // Admin Add New Rider
  const handleAddRider = (e) => {
    e.preventDefault();
    const idClean = newRiderForm.id.trim().toUpperCase();
    if (
      !idClean ||
      !newRiderForm.name.trim() ||
      !newRiderForm.phone.trim() ||
      !newRiderForm.town.trim()
    ) {
      setRiderFormError(
        'Rider ID, Name, Phone Number, and Assigned Town are required.'
      );
      return;
    }
    if (riders.some((r) => r.id.toUpperCase() === idClean)) {
      setRiderFormError('This Rider ID already exists.');
      return;
    }

    const added = {
      id: idClean,
      name: newRiderForm.name.trim(),
      phone: newRiderForm.phone.trim(),
      town: newRiderForm.town.trim(),
      vehicle: newRiderForm.vehicle.trim() || 'Courier Bike',
      active: true
    };

    setRiders((prev) => [...prev, added]);
    setNewRiderForm({ id: '', name: '', phone: '', town: '', vehicle: '' });
    setRiderFormError('');
  };

  // Admin Update Rider Town/Area
  const handleUpdateRiderTown = (riderId, newTown) => {
    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, town: newTown } : r))
    );
  };

  // Admin Remove Rider
  const handleRemoveRider = (riderId) => {
    if (loggedInRiderId === riderId) {
      setLoggedInRiderId(null);
    }
    setRiders((prev) => prev.filter((r) => r.id !== riderId));
  };

  // Derived Rider Data for Currently Logged-In Rider
  const currentRider = useMemo(
    () => riders.find((r) => r.id === loggedInRiderId) || null,
    [riders, loggedInRiderId]
  );

  const riderOrders = useMemo(
    () => orders.filter((o) => o.riderId === loggedInRiderId),
    [orders, loggedInRiderId]
  );

  const riderStats = useMemo(() => {
    const totalJobs = riderOrders.length;
    const droppedCount = riderOrders.filter((o) => o.status === 'Dropped').length;
    const holdCount = riderOrders.filter((o) => o.status === 'Hold').length;
    // Commission earned dynamically calculated from current rate percentage
    const totalCommission = riderOrders
      .filter((o) => o.status !== 'Hold')
      .reduce((acc, o) => acc + getDynamicRiderCommission(o), 0);

    return {
      totalJobs,
      droppedCount,
      holdCount,
      totalCommission
    };
  }, [riderOrders, pricing.riderCommissionPercent]);

  // Derived Admin Analytics
  const adminStats = useMemo(() => {
    const totalOrders = orders.length;
    const droppedOrders = orders.filter((o) => o.status === 'Dropped').length;
    const holdOrders = orders.filter((o) => o.status === 'Hold').length;

    const validOrders = orders.filter((o) => o.status !== 'Hold');
    const grossRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalRiderCommissions = validOrders.reduce(
      (sum, o) => sum + getDynamicRiderCommission(o),
      0
    );
    const netAdminProfit = grossRevenue - totalRiderCommissions;

    return {
      totalOrders,
      droppedOrders,
      holdOrders,
      grossRevenue,
      totalRiderCommissions,
      netAdminProfit
    };
  }, [orders, pricing.riderCommissionPercent]);

  // Helper to get Rider details by ID
  const getRiderById = (id) => riders.find((r) => r.id === id);

  // Filtered Customer Orders
  const filteredCustomerOrders = useMemo(() => {
    if (!customerSearch.trim()) return orders;
    const q = customerSearch.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q)
    );
  }, [orders, customerSearch]);

  // Initial Role Selection Screen ("Admin", "User / Customer", or "Rider")
  if (!entryRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4F9FD] via-[#FBF9F5] to-[#F3FBF7] text-slate-800 font-sans flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white/95 backdrop-blur rounded-3xl p-8 sm:p-10 border border-sky-100 shadow-2xl shadow-sky-100/60 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 via-teal-300 to-emerald-300 flex items-center justify-center shadow-lg shadow-sky-200/70 text-white mx-auto mb-5">
            <Truck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
            ANYWAY EXPRESS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-8">
            Welcome! Please select your portal to continue.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => {
                setEntryRole('admin');
                setActivePortal('admin');
              }}
              className="group p-5 rounded-3xl bg-gradient-to-br from-purple-50 to-white hover:from-purple-100 hover:to-purple-200/60 border-2 border-purple-200 hover:border-purple-500 transition-all text-left shadow-sm cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                Admin Portal
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Full management, rates & fleet control
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryRole('customer');
                setActivePortal('customer');
              }}
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#F4F9FD] to-white hover:from-sky-50 hover:to-sky-100/60 border-2 border-sky-100 hover:border-sky-400 transition-all text-left shadow-sm cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                User / Customer
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Place parcels & track deliveries live
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryRole('rider');
                setActivePortal('rider');
              }}
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#F3FBF7] to-white hover:from-teal-50 hover:to-emerald-100/50 border-2 border-teal-100 hover:border-teal-400 transition-all text-left shadow-sm cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                Rider Partner
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Inbox job alerts & delivery updates
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F9FD] via-[#FBF9F5] to-[#F3FBF7] text-slate-800 font-sans selection:bg-sky-200">
      {/* Top Navigation & Brand Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400 via-teal-300 to-emerald-300 flex items-center justify-center shadow-md shadow-sky-200/60 text-white">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-sky-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  ANYWAY EXPRESS
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {entryRole === 'customer'
                    ? 'CUSTOMER MODE'
                    : entryRole === 'admin'
                    ? 'ADMIN FULL ACCESS'
                    : 'RIDER MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fast, Reliable & Pastel-Clean Islandwide Delivery
              </p>
            </div>
          </div>

          {/* Role Navigation Bar (Admin sees all 3 portals; Rider sees Customer & Rider; Customer sees Customer) */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {(entryRole === 'rider' || entryRole === 'admin') && (
              <nav className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 flex-1 md:flex-initial">
                <button
                  onClick={() => setActivePortal('customer')}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activePortal === 'customer'
                      ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>Customer</span>
                </button>

                <button
                  onClick={() => setActivePortal('rider')}
                  className={`relative flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activePortal === 'rider'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-4 h-4 text-teal-500" />
                  <span>Rider</span>
                  {orders.some((o) => !o.acknowledged) && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>

                {(entryRole === 'admin') && (
                  <button
                    onClick={() => setActivePortal('admin')}
                    className={`relative flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      activePortal === 'admin'
                        ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <span>Admin</span>
                    {adminNotifications.some((n) => !n.read) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                    )}
                  </button>
                )}
              </nav>
            )}

            <button
              type="button"
              onClick={() => {
                setEntryRole(null);
                setLoggedInRiderId(null);
                setAdminUnlocked(false);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
            >
              Switch Role
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ================================================================= */}
        {/* 1. CUSTOMER PORTAL                                                */}
        {/* ================================================================= */}
        {activePortal === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Place New Order Form */}
            <div className="lg:col-span-5 bg-white/90 backdrop-blur rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-lg shadow-sky-100/40">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                    <Sparkles className="w-3.5 h-3.5" /> New Dispatch
                  </span>
                  <h2 className="text-xl font-bold text-slate-800 mt-2">
                    Send a Parcel
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <Box className="w-6 h-6" />
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Sender / Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Kavindi Perera"
                    value={customerForm.customerName}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFE] border border-sky-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Horana Town"
                      value={customerForm.pickupAddress}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          pickupAddress: e.target.value
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FBFE] border border-sky-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Colombo 07"
                      value={customerForm.deliveryAddress}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          deliveryAddress: e.target.value
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FBFE] border border-sky-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Package Details & Approx. Weight
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Gift Box (1.2 kg)"
                    value={customerForm.itemDescription}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        itemDescription: e.target.value
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFE] border border-sky-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm transition"
                  />
                </div>

                {/* Delivery Speed Selection: Normal vs Speed */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Delivery Service Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm({ ...customerForm, speed: 'Normal' })
                      }
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        customerForm.speed === 'Normal'
                          ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-100'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          customerForm.speed === 'Normal'
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">Normal</div>
                        <div className="text-xs text-slate-500">
                          Rs. {pricing.normalRate}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm({ ...customerForm, speed: 'Speed' })
                      }
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        customerForm.speed === 'Speed'
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-100'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          customerForm.speed === 'Speed'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">Speed</div>
                        <div className="text-xs text-amber-700 font-medium">
                          +Rs. {pricing.speedExtra}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Payment Method Selection: Paid vs Cash on Delivery (2% Commission) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm({ ...customerForm, paymentMethod: 'Paid' })
                      }
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        customerForm.paymentMethod === 'Paid'
                          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-100'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          customerForm.paymentMethod === 'Paid'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">Paid</div>
                        <div className="text-xs text-emerald-700">0% Extra Fee</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm({ ...customerForm, paymentMethod: 'COD' })
                      }
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        customerForm.paymentMethod === 'COD'
                          ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-100'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          customerForm.paymentMethod === 'COD'
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          Cash on Delivery
                        </div>
                        <div className="text-xs text-purple-700 font-medium">
                          +2% Commission
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Cost Breakdown Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F3F9FD] to-[#F3FBF7] border border-sky-100 space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Base Courier Rate ({customerForm.speed})</span>
                    <span className="font-semibold">
                      Rs. {calculatedOrderQuote.base.toLocaleString()}
                    </span>
                  </div>
                  {customerForm.speed === 'Speed' && (
                    <div className="flex justify-between text-xs text-amber-700">
                      <span>Express Speed Priority Charge</span>
                      <span className="font-semibold">
                        + Rs. {calculatedOrderQuote.speedCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>
                      COD Handling Commission (
                      {customerForm.paymentMethod === 'COD' ? '2%' : '0% - Paid'})
                    </span>
                    <span
                      className={`font-semibold ${
                        customerForm.paymentMethod === 'COD'
                          ? 'text-purple-700'
                          : 'text-emerald-600'
                      }`}
                    >
                      {customerForm.paymentMethod === 'COD'
                        ? `+ Rs. ${calculatedOrderQuote.codCommission.toLocaleString()}`
                        : 'Rs. 0'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-sky-200/70 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">
                      Total Payable
                    </span>
                    <span className="text-lg font-extrabold text-sky-700">
                      Rs. {calculatedOrderQuote.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm & Place Order</span>
                </button>
              </form>
            </div>

            {/* Right Column: Customer Order History & Live Tracking */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white/90 backdrop-blur rounded-3xl p-6 border border-sky-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Order History & Live Tracking
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track your parcel status, speed mode, and assigned rider contact
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Order ID or Name..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs focus:border-sky-400 outline-none"
                    />
                  </div>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                  {filteredCustomerOrders.length === 0 ? (
                    <div className="text-center py-14 px-4 rounded-2xl bg-[#F8FBFE] border border-dashed border-sky-200">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100/80 text-sky-600 flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">
                        No Orders Placed Yet
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Fill out the parcel details on the left and place an order to see live tracking and rider details here.
                      </p>
                    </div>
                  ) : (
                    filteredCustomerOrders.map((order) => {
                      const assignedRider = getRiderById(order.riderId);
                      const currentStepIndex =
                        order.status === 'Hold'
                          ? -1
                          : STATUS_STEPS.indexOf(order.status);

                      return (
                        <div
                          key={order.id}
                          className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#F9FCFF] border border-sky-100/90 hover:border-sky-300 transition-all shadow-sm"
                        >
                          {/* Top Row: ID, Speed Badge, Payment Badge, Delivery Status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-sky-800 bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                                {order.id}
                              </span>

                              {/* Speed vs Normal Badge */}
                              {order.speed === 'Speed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Zap className="w-3.5 h-3.5" /> SPEED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Clock className="w-3.5 h-3.5" /> NORMAL
                                </span>
                              )}

                              {/* Paid vs COD Badge */}
                              {order.paymentMethod === 'COD' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  COD (+2% Comm.)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  PAID
                                </span>
                              )}
                            </div>

                            {/* Live Status Pill */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(
                                order.status
                              )}`}
                            >
                              {order.status === 'Dropped'
                                ? '✓ Dropped (Delivered)'
                                : order.status}
                            </span>
                          </div>

                          {/* Middle Row: Route & Price */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-3.5">
                            <div className="sm:col-span-8 space-y-1.5">
                              <div className="text-xs text-slate-500">
                                Customer:{' '}
                                <span className="font-bold text-slate-800">
                                  {order.customerName}
                                </span>{' '}
                                • {order.itemDescription}
                              </div>
                              <div className="flex items-start gap-2 text-xs text-slate-700">
                                <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slate-500">
                                    From:
                                  </span>{' '}
                                  {order.pickupAddress}{' '}
                                  <span className="mx-1 text-slate-400">→</span>
                                  <span className="font-semibold text-slate-500">
                                    To:
                                  </span>{' '}
                                  <span className="font-medium text-slate-900">
                                    {order.deliveryAddress}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="sm:col-span-4 sm:text-right flex flex-col justify-center">
                              <span className="text-[11px] text-slate-400">
                                Total Amount
                              </span>
                              <span className="text-base font-extrabold text-slate-800">
                                Rs. {order.totalAmount.toLocaleString()}
                              </span>
                              {order.paymentMethod === 'COD' && (
                                <span className="text-[10px] text-purple-600 font-medium">
                                  (Includes Rs. {order.codFee} COD 2%)
                                </span>
                              )}
                            </div>
                          </div>

                        {/* Live Progress Tracker Bar */}
                        <div className="py-2.5 px-3 rounded-xl bg-slate-50/90 border border-slate-100 mb-3">
                          {order.status === 'Hold' ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <span>
                                Delivery is currently ON HOLD by rider. Please contact
                                rider below.
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-1.5">
                              {STATUS_STEPS.map((step, idx) => {
                                const completed = idx <= currentStepIndex;
                                return (
                                  <div key={step} className="space-y-1">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${
                                        completed ? 'bg-teal-500' : 'bg-slate-200'
                                      }`}
                                    />
                                    <div
                                      className={`text-[10px] font-semibold text-center ${
                                        completed ? 'text-teal-700' : 'text-slate-400'
                                      }`}
                                    >
                                      {step}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Assigned Rider Details & Call Action */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {assignedRider ? (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center border border-teal-200">
                                {assignedRider.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>Rider: {assignedRider.name}</span>
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {assignedRider.id}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Phone:{' '}
                                  <span className="font-semibold text-teal-700">
                                    {assignedRider.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">
                              Assigning nearest rider...
                            </span>
                          )}

                          {assignedRider && (
                            <a
                              href={`tel:${assignedRider.phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call {assignedRider.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. RIDER PORTAL                                                   */}
        {/* ================================================================= */}
        {activePortal === 'rider' && (
          <div>
            {entryRole === 'admin' && !loggedInRiderId && (
              /* Admin view switcher to inspect any rider portal */
              <div className="mb-6 bg-white/90 rounded-3xl p-5 border border-purple-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase">
                    Admin Fleet Inspector Mode
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Select a Rider to view and manage their portal:
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {riders.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLoggedInRiderId(r.id)}
                      className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition cursor-pointer"
                    >
                      {r.name} ({r.id})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!currentRider && !(deviceAdminBypass && (entryRole === 'admin' || activePortal === 'rider')) ? (
              /* Rider ID Only Login Screen (ID strictly masked & hidden) */
              <div className="max-w-md mx-auto bg-white/95 backdrop-blur rounded-3xl p-8 border border-teal-100 shadow-xl shadow-teal-100/40 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-400 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-200">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Rider Partner Login
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 mb-6">
                  Enter your confidential ANYWAY EXPRESS Rider ID to access your
                  inbox jobs, delivery status & daily commission.
                </p>

                <form onSubmit={handleRiderLogin} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rider ID (Hidden)
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      placeholder="••••••"
                      value={riderIdInput}
                      onChange={(e) => setRiderIdInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-teal-50/40 border border-teal-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-base font-bold tracking-widest text-center"
                    />
                  </div>

                  {riderLoginError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
                      {riderLoginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-200 transition cursor-pointer"
                  >
                    Access Rider Dashboard
                  </button>
                </form>
              </div>
            ) : (
              /* Logged-In Rider Dashboard (or Admin Bypass mode) */
              <div className="space-y-6">
                {/* Rider Profile Banner (Rider ID masked for privacy) */}
                <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-teal-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-400 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-teal-100">
                      <Truck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-800">
                          {currentRider ? currentRider.name : 'Admin Fleet Oversight'}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {currentRider ? (entryRole === 'admin' ? currentRider.id : '••••••') : 'ALL RIDERS BYPASS'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentRider ? `${currentRider.phone} • Area: ` : 'Admin Unrestricted Access • View all rider operations '}
                        {currentRider && <span className="font-bold text-teal-700">{currentRider.town}</span>}
                      </p>
                    </div>
                  </div>

                  {currentRider && (
                    <button
                      onClick={() => setLoggedInRiderId(null)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Switch / Logout Rider</span>
                    </button>
                  )}
                </div>

                {/* Rider Daily Performance & Commission KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 rounded-3xl p-5 border border-emerald-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 uppercase">
                        Today's Commission
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-500 text-white">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-900 mt-3">
                      Rs. {riderStats.totalCommission.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Earned from today's active & dropped jobs
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Total Jobs Today
                      </span>
                      <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800 mt-3">
                      {riderStats.totalJobs}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {currentRider ? `Assigned to ${currentRider.name}` : 'All fleet assignments'}
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Dropped (Completed)
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-3">
                      {riderStats.droppedCount}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Successfully delivered parcels
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Hold Parcels
                      </span>
                      <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-rose-600 mt-3">
                      {riderStats.holdCount}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Pending customer reschedule
                    </p>
                  </div>
                </div>

                {/* Rider Assigned Deliveries & Live Status Controller */}
                <div className="bg-white/95 rounded-3xl p-6 border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        My Assigned Deliveries ({riderOrders.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Update delivery status below — changes sync live to Customer &
                        Admin
                      </p>
                    </div>
                  </div>

                  {riderOrders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No orders assigned to {currentRider ? currentRider.name : 'fleet'} yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {riderOrders.map((job) => (
                        <div
                          key={job.id}
                          className="p-5 rounded-2xl bg-gradient-to-br from-[#F9FCFB] to-white border border-teal-100 shadow-sm flex flex-col justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">
                                  {job.id}
                                </span>
                                {job.speed === 'Speed' && (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                                    ⚡ SPEED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartRiderEdit(job)}
                                  title="Edit Pickup / Delivery Details"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                  Comm ({pricing.riderCommissionPercent}%): Rs.{' '}
                                  {getDynamicRiderCommission(job)}
                                </span>
                              </div>
                            </div>

                            <h4 className="font-bold text-sm text-slate-800">
                              {job.customerName}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {job.itemDescription} •{' '}
                              <span className="font-semibold text-slate-700">
                                Collect: Rs. {job.totalAmount} ({job.paymentMethod})
                              </span>
                            </p>

                            {editingOrderId === job.id ? (
                              <div className="mt-3 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2.5 text-xs">
                                <div className="font-bold text-sky-800 flex items-center justify-between">
                                  <span>Edit Pickup & Parcel Details</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOrderId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Pickup Address
                                  </label>
                                  <input
                                    type="text"
                                    value={riderEditForm.pickupAddress}
                                    onChange={(e) =>
                                      setRiderEditForm({
                                        ...riderEditForm,
                                        pickupAddress: e.target.value
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Delivery Address
                                  </label>
                                  <input
                                    type="text"
                                    value={riderEditForm.deliveryAddress}
                                    onChange={(e) =>
                                      setRiderEditForm({
                                        ...riderEditForm,
                                        deliveryAddress: e.target.value
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Parcel Notes / Weight
                                  </label>
                                  <input
                                    type="text"
                                    value={riderEditForm.itemDescription}
                                    onChange={(e) =>
                                      setRiderEditForm({
                                        ...riderEditForm,
                                        itemDescription: e.target.value
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-xs outline-none"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSaveRiderEdit(job.id, true)
                                    }
                                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] cursor-pointer"
                                  >
                                    Save & Confirm Picked Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOrderId(null)}
                                    className="py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-500">
                                    Pickup:
                                  </span>{' '}
                                  <span className="text-slate-800">
                                    {job.pickupAddress}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-500">
                                    Drop:
                                  </span>{' '}
                                  <span className="text-slate-800">
                                    {job.deliveryAddress}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Status Update Controls */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                              Update Delivery Status:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {['Picked Up', 'In Transit', 'Dropped', 'Hold'].map(
                                (st) => {
                                  const isActive = job.status === st;
                                  let btnStyle =
                                    'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent';
                                  if (isActive) {
                                    if (st === 'Dropped')
                                      btnStyle =
                                        'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                                    else if (st === 'Hold')
                                      btnStyle =
                                        'bg-rose-500 text-white border-rose-600 shadow-sm';
                                    else
                                      btnStyle =
                                        'bg-sky-500 text-white border-sky-600 shadow-sm';
                                  }

                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(job.id, st)
                                      }
                                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${btnStyle}`}
                                    >
                                      {st}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. ADMIN PORTAL (PASSCODE PROTECTED & HIDDEN)                     */}
        {/* ================================================================= */}
        {activePortal === 'admin' && (
          <div>
            {!adminUnlocked ? (
              /* Admin Security Lock Screen with Bubble Modal Style */
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border-2 border-purple-300 shadow-2xl shadow-purple-200/60 text-center animate-[fadeIn_0.25s_ease-out]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-purple-200 animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 mb-2">
                    Secured Executive Vault
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-800">
                    Admin Portal Login
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6">
                    Enter your confidential security passcode to access management controls.
                  </p>

                  <form onSubmit={handleAdminUnlock} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Security Access Code
                      </label>
                      <input
                        type="password"
                        required
                        autoComplete="off"
                        placeholder="••••••••••"
                        value={adminCodeInput}
                        onChange={(e) => setAdminCodeInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-purple-50/40 border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-base tracking-widest text-center font-bold"
                      />
                    </div>

                    {adminAuthError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                        {adminAuthError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-200 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Admin Vault</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* Unlocked Admin Dashboard */
              <div className="space-y-6">
                {/* Admin Header Bar */}
                <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Executive Overview
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-800 mt-1">
                      ANYWAY EXPRESS — Admin Command Center
                    </h2>
                  </div>

                  <button
                    onClick={() => setAdminUnlocked(false)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lock Admin Portal</span>
                  </button>
                </div>

                {/* Live Rider Pickup Notifications Feed for Admin */}
                {adminNotifications.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 rounded-3xl p-5 border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-purple-950">
                            Live Rider Pickup Alerts ({adminNotifications.length})
                          </h3>
                          <p className="text-[11px] text-purple-700">
                            Instant notification when a rider picks up a customer parcel
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAdminNotifications([])}
                        className="text-xs font-bold text-purple-700 hover:text-purple-950 px-3 py-1.5 rounded-xl bg-white/80 border border-purple-200 transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {adminNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() =>
                            setAdminNotifications((prev) =>
                              prev.map((n) =>
                                n.id === notif.id ? { ...n, read: true } : n
                              )
                            )
                          }
                          className={`p-3.5 rounded-2xl bg-white border transition flex items-start justify-between gap-2 ${
                            notif.read
                              ? 'border-purple-100'
                              : 'border-purple-400 ring-2 ring-purple-100'
                          }`}
                        >
                          <div className="text-xs space-y-0.5">
                            <div className="font-extrabold text-indigo-800 flex items-center gap-1.5">
                              <span>📦 Order {notif.orderId} Picked Up!</span>
                            </div>
                            <div className="text-slate-700">
                              Rider:{' '}
                              <span className="font-bold">
                                {notif.riderName} ({notif.riderId})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              From: {notif.pickupAddress} • {notif.time}
                            </div>
                          </div>
                          {!notif.read && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                              NEW
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5 Financial & Operations KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Daily Orders
                    </span>
                    <div className="text-2xl font-extrabold text-slate-800 mt-2">
                      {adminStats.totalOrders}
                    </div>
                    <span className="text-[11px] text-sky-600 font-medium">
                      Total bookings today
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Dropped (Delivered)
                    </span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-2">
                      {adminStats.droppedOrders}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      Completed drops
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Hold Orders
                    </span>
                    <div className="text-2xl font-extrabold text-rose-600 mt-2">
                      {adminStats.holdOrders}
                    </div>
                    <span className="text-[11px] text-rose-600 font-medium">
                      Requires follow-up
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 rounded-3xl p-5 border border-amber-200/80 shadow-sm">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">
                      Rider Commissions
                    </span>
                    <div className="text-2xl font-extrabold text-amber-900 mt-2">
                      Rs. {adminStats.totalRiderCommissions.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Payable to fleet riders
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50/80 rounded-3xl p-5 border border-purple-200 shadow-sm">
                    <span className="text-[11px] font-bold text-purple-800 uppercase">
                      Net Admin Profit
                    </span>
                    <div className="text-2xl font-extrabold text-purple-900 mt-2">
                      Rs. {adminStats.netAdminProfit.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-purple-700 font-medium">
                      After rider payouts
                    </span>
                  </div>
                </div>

                {/* Middle Row: Editable Price Rates (Admin Only) & Add New Rider */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Editable Price Rates Panel */}
                  <div className="lg:col-span-5 bg-white/95 rounded-3xl p-6 border border-purple-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                          <Edit3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800">
                            Delivery Price Rates
                          </h3>
                          <p className="text-xs text-slate-500">
                            Only Admin can modify customer & rider rates
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveRates} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Normal Delivery Base Rate (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={tempPricing.normalRate}
                          onChange={(e) =>
                            setTempPricing({
                              ...tempPricing,
                              normalRate: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/30 border border-purple-100 focus:border-purple-400 outline-none text-sm font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Speed Delivery Extra Charge (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={tempPricing.speedExtra}
                          onChange={(e) =>
                            setTempPricing({
                              ...tempPricing,
                              speedExtra: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/30 border border-purple-100 focus:border-purple-400 outline-none text-sm font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Rider Commission Share (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={tempPricing.riderCommissionPercent}
                          onChange={(e) =>
                            setTempPricing({
                              ...tempPricing,
                              riderCommissionPercent: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/30 border border-purple-100 focus:border-purple-400 outline-none text-sm font-bold"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {ratesSavedToast ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Rates Updated Live!
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            COD Fee fixed at 2%
                          </span>
                        )}

                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200 transition cursor-pointer"
                        >
                          Save New Rates
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Add / Remove Riders & Individual Rider Commission Payouts */}
                  <div className="lg:col-span-7 bg-white/95 rounded-3xl p-6 border border-purple-100 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">
                          Manage Riders & Individual Commissions
                        </h3>
                        <p className="text-xs text-slate-500">
                          Add new riders, remove inactive riders, and view payout per
                          rider
                        </p>
                      </div>
                    </div>

                    {/* Add New Rider Inline Form */}
                    <form
                      onSubmit={handleAddRider}
                      className="p-4 rounded-2xl bg-[#F6FBF9] border border-teal-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Rider ID
                        </label>
                        <input
                          type="text"
                          placeholder="RDR-04"
                          value={newRiderForm.id}
                          onChange={(e) =>
                            setNewRiderForm({ ...newRiderForm, id: e.target.value })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-white border border-teal-200 text-xs font-bold uppercase outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Supun Kumara"
                          value={newRiderForm.name}
                          onChange={(e) =>
                            setNewRiderForm({ ...newRiderForm, name: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="077 123 4567"
                          value={newRiderForm.phone}
                          onChange={(e) =>
                            setNewRiderForm({ ...newRiderForm, phone: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Assigned Town
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Gampaha"
                          value={newRiderForm.town}
                          onChange={(e) =>
                            setNewRiderForm({ ...newRiderForm, town: e.target.value })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-white border border-teal-200 text-xs font-semibold outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>
                      {riderFormError && (
                        <div className="sm:col-span-12 text-xs text-rose-600 font-medium">
                          {riderFormError}
                        </div>
                      )}
                    </form>

                    {/* Riders Table with Assigned Town, Commission Payable & Remove Action */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                            <th className="py-2.5 px-3">Rider</th>
                            <th className="py-2.5 px-3">Assigned Town</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3 text-center">Dropped</th>
                            <th className="py-2.5 px-3 text-center">Hold</th>
                            <th className="py-2.5 px-3 text-right">
                              Commission Payable
                            </th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {riders.map((rider) => {
                            const rOrders = orders.filter(
                              (o) => o.riderId === rider.id
                            );
                            const rDropped = rOrders.filter(
                              (o) => o.status === 'Dropped'
                            ).length;
                            const rHold = rOrders.filter(
                              (o) => o.status === 'Hold'
                            ).length;
                            const rCommPayable = rOrders
                              .filter((o) => o.status !== 'Hold')
                              .reduce(
                                (sum, o) => sum + getDynamicRiderCommission(o),
                                0
                              );

                            return (
                              <tr key={rider.id} className="hover:bg-slate-50/80">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">
                                    {rider.name}
                                  </div>
                                  <div className="text-[11px] text-teal-600 font-semibold">
                                    {rider.id}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <input
                                    type="text"
                                    value={rider.town || ''}
                                    onChange={(e) =>
                                      handleUpdateRiderTown(
                                        rider.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Set Town"
                                    className="w-28 px-2.5 py-1 rounded-lg bg-purple-50/60 border border-purple-200 text-xs font-bold text-purple-800 focus:border-purple-500 outline-none"
                                  />
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {rider.phone}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-emerald-600">
                                  {rDropped}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-rose-600">
                                  {rHold}
                                </td>
                                <td className="py-3 px-3 text-right font-extrabold text-amber-700">
                                  Rs. {rCommPayable.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleRemoveRider(rider.id)}
                                    title="Remove Rider"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Full System Orders & Profit Breakdown Table */}
                <div className="bg-white/95 rounded-3xl p-6 border border-purple-100 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">
                    All Daily Orders & Net Profit Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Customer & Route</th>
                          <th className="py-2.5 px-3">Type / Pay</th>
                          <th className="py-2.5 px-3">Rider</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Total Fee</th>
                          <th className="py-2.5 px-3 text-right">Rider Comm.</th>
                          <th className="py-2.5 px-3 text-right">Admin Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {orders.map((ord) => {
                          const r = getRiderById(ord.riderId);
                          const liveRiderComm = getDynamicRiderCommission(ord);
                          const orderProfit = ord.totalAmount - liveRiderComm;
                          return (
                            <tr key={ord.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-3 font-bold text-sky-700">
                                {ord.id}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800">
                                  {ord.customerName}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {ord.pickupAddress} → {ord.deliveryAddress}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold">{ord.speed}</span> •{' '}
                                <span
                                  className={
                                    ord.paymentMethod === 'COD'
                                      ? 'text-purple-700 font-bold'
                                      : 'text-emerald-700'
                                  }
                                >
                                  {ord.paymentMethod}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-700">
                                {r ? `${r.name} (${r.id} • ${r.town})` : ord.riderId}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(
                                    ord.status
                                  )}`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-800">
                                Rs. {ord.totalAmount}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-amber-700">
                                Rs. {liveRiderComm}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-purple-700">
                                Rs. {orderProfit}
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
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* CUSTOMER ORDER PLACED ANIMATED GREEN CHECKMARK ("TICK") POPUP MODAL */}
      {/* =================================================================== */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 text-center border border-emerald-100 shadow-2xl animate-[fadeIn_0.25s_ease-out]">
            {/* Animated Green Checkmark Circle */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 animate-bounce">
              <Check className="w-11 h-11 stroke-[3]" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-800">
              Order Placed Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Your parcel has been dispatched to our rider network.
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-[#F5FBF8] border border-emerald-100 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tracking ID:</span>
                <span className="font-extrabold text-sky-700">
                  {orderSuccessModal.order.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Mode:</span>
                <span className="font-bold text-slate-800">
                  {orderSuccessModal.order.speed} (
                  {orderSuccessModal.order.paymentMethod})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-extrabold text-emerald-700">
                  Rs. {orderSuccessModal.order.totalAmount.toLocaleString()}
                </span>
              </div>
              {orderSuccessModal.rider && (
                <div className="pt-2 border-t border-emerald-200/60 flex justify-between">
                  <span className="text-slate-500">Assigned Rider:</span>
                  <span className="font-bold text-teal-800">
                    {orderSuccessModal.rider.name} ({orderSuccessModal.rider.phone})
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setOrderSuccessModal(null)}
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-md shadow-emerald-200 transition cursor-pointer"
            >
              Done & Track Order
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* RIDER NEW ORDER INBOX MESSAGE POPUP NOTIFICATION                    */}
      {/* =================================================================== */}
      {/* RIDER NEW ORDER INBOX MESSAGE POPUP NOTIFICATION (RIDER PORTAL ONLY)*/}
      {/* =================================================================== */}
      {entryRole === 'rider' &&
        activePortal === 'rider' &&
        inboxPopupOrder &&
        currentRider && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100%-2.5rem)] bg-white rounded-3xl p-5 border-2 border-teal-400 shadow-2xl shadow-teal-200/70 animate-[slideUp_0.3s_ease-out]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                  New Inbox Order Alert
                </span>
                <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">
                  Order {inboxPopupOrder.id} Assigned!
                </h4>
              </div>
            </div>
            <button
              onClick={() => handleAcknowledgeInboxOrder(inboxPopupOrder.id)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 p-3 rounded-2xl bg-teal-50/60 border border-teal-100 text-xs space-y-1">
            <div className="font-bold text-slate-800">
              {inboxPopupOrder.customerName} • {inboxPopupOrder.speed}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold">Pickup:</span>{' '}
              {inboxPopupOrder.pickupAddress}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold">Drop:</span>{' '}
              {inboxPopupOrder.deliveryAddress}
            </div>
            <div className="pt-1 flex justify-between font-bold text-emerald-700">
              <span>Your Commission ({pricing.riderCommissionPercent}%):</span>
              <span>Rs. {getDynamicRiderCommission(inboxPopupOrder)}</span>
            </div>
          </div>

          <button
            onClick={() => handleAcknowledgeInboxOrder(inboxPopupOrder.id)}
            className="mt-3.5 w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            Accept & Open Job
          </button>
        </div>
      )}
    </div>
  );
}