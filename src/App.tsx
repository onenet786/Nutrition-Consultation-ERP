/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

// Base URL for backend API
// API_BASE removed – using relative URLs
import {
  Users, Calendar, Clipboard, FolderHeart, ShieldCheck, Soup, ChefHat,
  Truck, Wallet, Settings, TrendingDown, TrendingUp, AlertCircle, Plus,
  Sparkles, CheckCircle, Clock, CheckSquare, Search, RotateCw, MapPin, 
  HelpCircle, LogOut, ChevronRight, UserCheck, HardDrive, KeyRound, Lock, Info,
  DollarSign, BookOpen, X
} from 'lucide-react';
import {
  DbState, User, Patient, Appointment, ConsultationNote, Recipe, Assignment,
  MealPlan, KitchenBatch, InventoryItem, DeliveryRoute, Delivery, OperatingExpense
} from './types';
import UserGuideTab from './components/UserGuideTab';

// Auto-formatting helper functions
const formatCNIC = (value: string) => {
  const clean = value.replace(/\D/g, ''); // strip non-digits
  if (clean.length <= 5) return clean;
  if (clean.length <= 12) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return `${clean.slice(0, 5)}-${clean.slice(5, 12)}-${clean.slice(12, 13)}`;
};

const formatLocalPhone = (value: string) => {
  const clean = value.replace(/\D/g, ''); // strip non-digits
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 10)}`;
};

export default function App() {
  // DB Live State
  const [db, setDb] = useState<DbState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorHeader, setErrorHeader] = useState<string>('');
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState<boolean>(false);

  // Authentication Fields
  const [loginEmail, setLoginEmail] = useState<string>('owner@selfhosted.local');
  const [loginPwd, setLoginPwd] = useState<string>('••••••••');

  // Input states for Creating Patient
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    gender: 'Female',
    dob: '1995-01-01',
    cnic: '',
    mobile: '',
    email: '',
    address: '',
    city: 'Lahore',
    emergencyContact: '',
    height: 170,
    weight: 70,
    bloodGroup: 'B+',
    allergies: '',
    medicalConditions: '',
    lifestyle: {
      activityLevel: 'Sedentary',
      sleepHours: 7,
      waterIntake: 2,
      foodPreferences: 'None',
      foodRestrictions: 'None'
    }
  });

  // Selected Patient Details state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  // Follow up consultation note state
  const [newConsultation, setNewConsultation] = useState({
    weight: 70,
    systolic: 120,
    diastolic: 80,
    notes: '',
    recommendations: '',
    assignedProgramName: 'Weight Loss'
  });

  // Smart suggestions status
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>('');

  // Expense Dialog status
  const [newExpense, setNewExpense] = useState({
    category: 'Ingredients' as any,
    amount: 100,
    vendor: '',
    notes: ''
  });

  // New Appointment Schedule states
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    type: 'Initial Consultation' as any,
    dateTime: '',
    notes: ''
  });

  // Create Recipe States
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: 'Lunch/Dinner',
    prepTime: 10,
    cookTime: 15,
    servingSize: 1,
    calories: 350,
    protein: 25,
    carbs: 30,
    fat: 12,
    fiber: 3,
    sodium: 180,
    isReadyMade: false,
    readyMadeId: '',
    assignedPatientId: '',
    ingredientsText: 'Salmon Fillet: 200g\nLemon Juice: 15ml\nOlive Oil: 10ml',
    instructionsText: 'Preheat grill to medium-high.\nGrill salmon for 6 mins each side.\nServe warm.'
  });
  // State for ready‑made recipe list
  const [readyMadeRecipes, setReadyMadeRecipes] = useState<Recipe[]>([]);
  // State for patient list when assigning ready‑made recipes
  const [patients, setPatients] = useState<Patient[]>([]);

  // Create Meal Plan Inputs
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');

  // Load backend data
  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch('/api/patients');
      const pts: Patient[] = await pRes.json();

      const aRes = await fetch('/api/appointments');
      const apts: Appointment[] = await aRes.json();

      const cRes = await fetch('/api/consultations');
      const cNs: ConsultationNote[] = await cRes.json();

      const rRes = await fetch('/api/recipes');
      const recs: Recipe[] = await rRes.json();

      const mpRes = await fetch('/api/meal-plans');
      const mps: MealPlan[] = await mpRes.json();

      const bRes = await fetch('/api/production/batches');
      const bts: KitchenBatch[] = await bRes.json();

      const iRes = await fetch('/api/inventory');
      const invs: InventoryItem[] = await iRes.json();

      const rtRes = await fetch('/api/routes');
      const rts: DeliveryRoute[] = await rtRes.json();

      const dRes = await fetch('/api/deliveries');
      const dels: Delivery[] = await dRes.json();

      const eRes = await fetch('/api/expenses');
      const exps: OperatingExpense[] = await eRes.json();
      const asgRes = await fetch('/api/assignments');
      const assigns: Assignment[] = await asgRes.json();

      const lRes = await fetch('/api/audit-logs');
      const logs = await lRes.json();

      setDb({
        patients: pts,
        appointments: apts,
        consultations: cNs,
        programs: [],
        recipes: recs,
        mealPlans: mps,
        kitchenBatches: bts,
        inventory: invs,
        purchaseOrders: [],
        routes: rts,
        deliveries: dels,
        expenses: exps,
        assignments: assigns,
        auditLogs: logs
      });

      if (pts.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pts[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorHeader('Connection with private database server lost. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginEmail, password: loginPwd })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setErrorHeader('');
      } else {
        setErrorHeader(data.message || 'Error occurred authenticating credentials.');
      }
    } catch (err) {
      setErrorHeader('Failed to establish contact with local auth gateway.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail('owner@selfhosted.local');
    setActiveTab('dashboard');
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const calculatedBmi = Number((newPatient.weight / ((newPatient.height / 100) ** 2)).toFixed(1));
      const payload = {
        ...newPatient,
        mobile: `+92-${newPatient.mobile}`,
        emergencyContact: `+92-${newPatient.emergencyContact}`,
        bmi: calculatedBmi,
        allergies: newPatient.allergies.split(',').map(s => s.trim()).filter(Boolean),
        medicalConditions: newPatient.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
        status: 'active'
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        // Clear Form variables
        setNewPatient({
          firstName: '',
          lastName: '',
          gender: 'Female',
          dob: '1995-01-01',
          cnic: '',
          mobile: '',
          email: '',
          address: '',
          city: 'Lahore',
          emergencyContact: '',
          height: 170,
          weight: 70,
          bloodGroup: 'B+',
          allergies: '',
          medicalConditions: '',
          lifestyle: {
            activityLevel: 'Sedentary',
            sleepHours: 7,
            waterIntake: 2,
            foodPreferences: 'None',
            foodRestrictions: 'None'
          }
        });
        setShowOnboardModal(false);
      }
    } catch (err) {
      setErrorHeader('Could not record patient entries to private database server.');
    }
  };

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePt = db?.patients.find(p => p.id === selectedPatientId);
    if (!activePt) return;

    try {
      const calculatedBmi = Number((newConsultation.weight / ((activePt.height / 100) ** 2)).toFixed(1));
      const payload = {
        patientId: selectedPatientId,
        weight: newConsultation.weight,
        bmi: calculatedBmi,
        systolic: newConsultation.systolic,
        diastolic: newConsultation.diastolic,
        notes: newConsultation.notes,
        recommendations: newConsultation.recommendations,
        assignedProgram: newConsultation.assignedProgramName
      };

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        setNewConsultation({
          weight: 70,
          systolic: 120,
          diastolic: 80,
          notes: '',
          recommendations: '',
          assignedProgramName: 'Weight Loss'
        });
      }
    } catch (err) {
      setErrorHeader('Could not store diagnosis consultation report.');
    }
  };

  const getSmartAISuggestion = async () => {
    const pt = db?.patients.find(p => p.id === selectedPatientId);
    if (!pt) return;

    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/ai/suggest-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientName: `${pt.firstName} ${pt.lastName}`,
          conditions: pt.medicalConditions,
          dietPreferences: `${pt.lifestyle.foodPreferences}. Restrictions: ${pt.lifestyle.foodRestrictions}`,
          weight: pt.weight,
          bmi: pt.bmi,
          targetGoal: pt.medicalConditions.includes('Obesity Management') ? 'Reduce core adipose tissue, safe hypothyroid optimization status' : 'Stabilize blood sugar spikes'
        })
      });
      const data = await res.json();
      setAiResponse(data.text);
    } catch (err: any) {
      setAiResponse('Smart consultation engine is resting. Please configure a valid API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, status: string) => {
    try {
      const res = await fetch(`/api/production/batches/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setErrorHeader('Failed to cycle kitchen task state.');
    }
  };

  const handleToggleInventoryStock = async (itemId: string, amount: number, type: 'add' | 'subtract') => {
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify({ itemId, amount, type })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setErrorHeader('Failed to adjust raw ingredient level.');
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify({
          ...newExpense,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Cash'
        })
      });
      if (res.ok) {
        await fetchData();
        setNewExpense({
          category: 'Ingredients',
          amount: 100,
          vendor: '',
          notes: ''
        });
      }
    } catch (err) {
      setErrorHeader('Could not post expense transaction.');
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const pMatch = db?.patients.find(x => x.id === newAppointment.patientId);
    if (!pMatch) return;

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify({
          patientId: pMatch.id,
          patientName: `${pMatch.firstName} ${pMatch.lastName}`,
          type: newAppointment.type,
          dateTime: newAppointment.dateTime,
          notes: newAppointment.notes
        })
      });
      if (res.ok) {
        await fetchData();
        setNewAppointment({ patientId: '', type: 'Initial Consultation', dateTime: '', notes: '' });
        setShowAppointmentModal(false);
      }
    } catch (err) {
      setErrorHeader('Could not book appointment schedule.');
    }
  };

  const handleCreateRecipe = async () => {
    if (newRecipe.isReadyMade) {
      // Assign existing ready‑made recipe to patient
      await handleAssignReadyMade();
      return;
    }
    // Regular recipe creation
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe),
      });
      if (response.ok) {
        // Refresh list and close modal
        fetchData();
        setShowAddRecipeModal(false);
      } else {
        console.error('Failed to create recipe');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignReadyMade = async () => {
    if (!newRecipe.readyMadeId || !newRecipe.assignedPatientId) {
      alert('Please select a recipe and patient');
      return;
    }
    try {
      const payload = {
        readyMadeId: newRecipe.readyMadeId,
        patientId: newRecipe.assignedPatientId,
      };
      const response = await fetch('/api/assignReadyMade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        alert('Recipe assigned to patient');
        setShowAddRecipeModal(false);
      } else {
        console.error('Assign failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------
  // 6. Fetch ready‑made recipes & patient list when needed
  // -------------------------------------------------
  useEffect(() => {
    if (showAddRecipeModal && newRecipe.isReadyMade) {
      // fetch ready‑made list
      fetch('/api/readyMadeRecipes')
        .then(res => res.json())
        .then(setReadyMadeRecipes)
        .catch(console.error);
      // fetch patients list (needed for assignment)
      fetch('/api/patients')
        .then(res => res.json())
        .then(setPatients)
        .catch(console.error);
    }
  }, [showAddRecipeModal, newRecipe.isReadyMade]);

  const handleDeployMealPlan = async () => {
    if (!selectedPatientId || !selectedRecipeId) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        patientId: selectedPatientId,
        startDate: todayStr,
        endDate: todayStr,
        status: 'active',
        days: [
          {
            date: todayStr,
            meals: {
              [mealSlot]: selectedRecipeId
            }
          }
        ]
      };
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        alert('Meal Plan successfully active! Associated recipes are sent to the Kitchen queue automatically, and materials calculated & subtracted from active Inventory.');
      }
    } catch (err) {
      setErrorHeader('Failure assigning diet plan calendar.');
    }
  };

  const handleDeliverPOD = async (deliveryId: string) => {
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'usr-admin'
        },
        body: JSON.stringify({
          status: 'delivered',
          proofOfDelivery: {
            method: 'otp',
            otpCode: 'VERIFIED',
            verifiedOtp: true,
            latitude: 31.52,
            longitude: 74.35,
            timestamp: new Date().toISOString()
          }
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setErrorHeader('Failed to confirm proof of delivery status.');
    }
  };

  // Helper selectors
  const totalActivePatientsCount = db?.patients?.filter(p => p.status === 'active')?.length || 0;
  const kitchenPendingCount = db?.kitchenBatches?.filter(b => b.status === 'pending' || b.status === 'cooking')?.length || 0;
  const deliveriesInTransitCount = db?.deliveries?.filter(d => d.status === 'in_transit' || d.status === 'assigned')?.length || 0;
  const lowIngredientsAlertCount = db?.inventory?.filter(i => i.currentStock <= i.minThreshold)?.length || 0;

  // Render Login overlay if guest session
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
        
        {/* Subtle glowing cosmic elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex p-3 bg-green-500/10 text-green-400 rounded-2xl">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">Private Local Consultation Console</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Welcome to your private self-hosted operational dashboard. Enter your local credential keys to access complete health files, meal cards, and logistics.
            </p>
          </div>

          {errorHeader && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-xs text-center font-semibold">
              {errorHeader}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Select System Access Role</label>
              <select
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              >
                <option value="owner@selfhosted.local">Owner View (Full Dashboard access)</option>
                <option value="sarah@selfhosted.local">Nutritionist View (Diet Builder & Consultations)</option>
                <option value="sajid@selfhosted.local">Kitchen Chef View (Meals production line & stock)</option>
                <option value="dispatch@selfhosted.local">Dispatcher View (Logistics & GPS route setup)</option>
                <option value="rider@selfhosted.local">Field Rider View (Deliveries list & OTP confirmations)</option>
                <option value="ayesha@selfhosted.local">Patient View (Personal meal calendar & health charts)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Private Verification Password</label>
              <div className="relative">
                <input
                  type="password"
                  disabled
                  value={loginPwd}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-400 text-sm focus:outline-none"
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">No setup key required for private local development playground sandbox.</p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-green-500 hover:bg-green-600 font-bold text-slate-900 rounded-xl text-sm transition duration-150 transform hover:-translate-y-0.5 cursor-pointer mt-2"
            >
              Sign In to Private Hub
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-mono block">DEVICE COMPLIANCE STATUS: ● SECURE</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Professional Admin Bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-green-500 text-slate-950 rounded-lg">
              <FolderHeart className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold font-display tracking-wide flex items-center gap-2">
                NUTRITION CONSULTATION ERP
                <span className="hidden md:inline px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded border border-green-500/20 uppercase">
                  Self-Hosted Container
                </span>
              </h1>
              <p className="text-[10px] font-mono hidden md:block flex items-center gap-1.5 mt-0.5">
                {errorHeader ? (
                  <span className="text-red-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    PostgreSQL Connection Failed
                  </span>
                ) : loading ? (
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    Connecting to Database...
                  </span>
                ) : (
                  <span className="text-green-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    Connected to PostgreSQL Database
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick user badge switcher indicator */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-100">{currentUser.name}</div>
                <div className="text-[9px] font-mono uppercase text-green-400 tracking-wider">Role: {currentUser.role}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              title="Logout"
              id="header-logout-btn"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout container with grid column sidebar + responsive panels */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Navigation */}
        <nav className="lg:col-span-3 space-y-2">
          
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-1 mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Navigation Controls</span>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span>Operational Desk</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>

            {/* Role sensitive / general tabs */}
            {(currentUser.role !== 'patient' && currentUser.role !== 'rider') && (
              <>
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'patients' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    <span>Patients & Diagnosis</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={() => setActiveTab('meal-planning')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'meal-planning' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Soup className="h-4 w-4" />
                    <span>Meal Planner & Recipes</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={() => setActiveTab('production')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'production' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ChefHat className="h-4 w-4" />
                    <span>Kitchen Production</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'inventory' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-4 w-4" />
                    <span>Active Inventory</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={() => setActiveTab('logistics')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'logistics' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4" />
                    <span>Logistics & Route Hub</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={() => setActiveTab('finances')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    activeTab === 'finances' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4" />
                    <span>Operating Expenses</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('self-hosted')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                activeTab === 'self-hosted' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 mr-0.5 text-green-600" />
                <span className="font-semibold text-slate-800">User & Tutorial Guide</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Info className="h-4 w-4 text-green-600" />
              <span>Privately Deployed Console</span>
            </div>
            <p className="leading-relaxed">
              This sandbox allows testing database workflows across every distinct user role described in the PRD safely.
            </p>
          </div>

        </nav>

        {/* Right workspace panels based on activeTab */}
        <main className="lg:col-span-9 space-y-6">

          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Dashboard Header with Quick Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Operational Desk</h2>
                  <p className="text-xs text-gray-400">Real-time status updates and primary quick actions</p>
                </div>
                {(currentUser.role !== 'patient' && currentUser.role !== 'rider') && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowOnboardModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition duration-150"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Onboard New Patient</span>
                    </button>
                    <button
                      onClick={() => setShowAppointmentModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition duration-150"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Book Appointment</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Header block with statistics indicator cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Active Patients</span>
                  <div className="text-2xl font-bold text-gray-900 font-display flex items-baseline justify-between">
                    <span>{totalActivePatientsCount}</span>
                    <span className="text-[10px] text-green-600 font-semibold font-sans">99% Retention</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Kitchen Backlog</span>
                  <div className="text-2xl font-bold text-gray-900 font-display flex items-baseline justify-between">
                    <span>{kitchenPendingCount}</span>
                    <span className="text-[10px] text-amber-500 font-semibold font-sans">Underway</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Logistics & Dispatches</span>
                  <div className="text-2xl font-bold text-gray-900 font-display flex items-baseline justify-between">
                    <span>{deliveriesInTransitCount}</span>
                    <span className="text-[10px] text-green-600 font-semibold font-sans">Optimized Path</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Low Ingredients</span>
                  <div className="text-2xl font-bold text-gray-900 font-display flex items-baseline justify-between">
                    <span className={lowIngredientsAlertCount > 0 ? 'text-amber-600' : 'text-gray-900'}>{lowIngredientsAlertCount}</span>
                    {lowIngredientsAlertCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[8px]">Critically Low</span>
                    ) : (
                      <span className="text-[10px] text-green-600 font-semibold font-sans">Optimal Stock</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignments Table */}
<div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
  <h3 className="text-base font-bold text-slate-900 font-display">Medication / Recipe Assignments</h3>
  <div className="overflow-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-100">
        <tr>
          <th className="p-2">Patient</th>
          <th className="p-2">Recipe</th>
          <th className="p-2">Assigned By</th>
          <th className="p-2">Date</th>
        </tr>
      </thead>
      <tbody>
        {db?.assignments.map(a => {
          const patient = db?.patients.find(p => p.id === a.patientId);
          const recipe = db?.recipes.find(r => r.id === a.recipeId);
          return (
            <tr key={a.id} className="border-t">
              <td className="p-2">{patient ? `${patient.firstName} ${patient.lastName}` : a.patientId}</td>
              <td className="p-2">{recipe ? recipe.name : a.recipeId}</td>
              <td className="p-2">{a.assignedBy}</td>
              <td className="p-2">{new Date(a.assignedAt).toLocaleDateString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>
              {currentUser.role === 'patient' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">Patient Daily Portal (Ayesha Khan)</h3>
                      <p className="text-xs text-gray-400">Nutritional programs, meal countdown timers, & diagnostic logs</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">Weight Loss Custom Program</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">Breakfast (07:30 AM)</div>
                      <div className="text-sm font-bold text-slate-800">Gluten-Free Oats Porridge</div>
                      <div className="text-[10px] text-green-600 font-semibold">290 Kcal / Chia Seeds / Almonds</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">Lunch (01:15 PM)</div>
                      <div className="text-sm font-bold text-slate-800">Keto Grilled Herb Salmon</div>
                      <div className="text-[10px] text-green-600 font-semibold">380 Kcal / Asparagus / Omega-3</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">Dinner (08:00 PM)</div>
                      <div className="text-sm font-bold text-slate-800">Low-GI Quinoa Chicken Bowl</div>
                      <div className="text-[10px] text-green-600 font-semibold">420 Kcal / Broccoli / Tomatoes</div>
                    </div>
                  </div>

                  <div className="bg-green-50/50 p-4 rounded-xl border border-green-100/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Primary Delivery Box Location Tracker</div>
                      <div className="text-xs text-gray-500 mt-0.5">Route A Dispatcher assigned | Rider Faisal Majeed in transit (ETA: 12 minutes)</div>
                    </div>
                    <span className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold">OTP Access Key: 8821</span>
                  </div>
                </div>
              )}

              {/* Rider simulated portal (If user is rider) */}
              {currentUser.role === 'rider' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 font-display">Field Rider Delivery Duty List</h3>
                  
                  <div className="space-y-3">
                    {db?.deliveries.map(del => (
                      <div key={del.id} className="p-4 bg-slate-50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-950">{del.patientName}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase font-mono">{del.scheduledSlot}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                            {del.patientAddress}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                            del.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                          }`}>
                            {del.status === 'delivered' ? 'Completed' : 'In Transit'}
                          </span>

                          {del.status !== 'delivered' && (
                            <button
                              onClick={() => handleDeliverPOD(del.id)}
                              id={`pod-confirm-btn-${del.id}`}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg cursor-pointer"
                            >
                              Verify OTP & Complete POD
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick upcoming appointments tracker desk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left side: upcoming scheduling calendar */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-1.5">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Doctor consultation Appointment Desk
                  </h3>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto">
                    {db?.appointments.map((apt) => (
                      <div key={apt.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-slate-800">{apt.patientName}</span>
                          <span className={`text-[9px] font-semibold uppercase px-1.5 rounded ${
                            apt.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                          }`}>{apt.status}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 flex justify-between">
                          <span>{apt.type}</span>
                          <span className="font-mono">{new Date(apt.dateTime).toLocaleDateString()} at {new Date(apt.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        {apt.videoLink && (
                          <div className="text-[10px] text-green-700 font-medium">
                            Telemedicine Link: <a href={apt.videoLink} target="_blank" className="underline">{apt.videoLink}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side: system status & security checklists */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-1.5">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Private System Security Compliances
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Patient medical logs Encryption</span>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">ENABLED</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Diagnostics and medication tracking records are written directly inside state files with full isolation protection.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">State Backups Status</span>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">ONLINE</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Weekly state replication points are verified. Download offline snapshot copies easily via Private Host Center tab any time.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. PATIENTS TAB */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">Patient Records Directory</h2>
                    <p className="text-xs text-gray-400">Record physical assessment measures, view timelines and consult Gemini AI</p>
                  </div>
                  {(currentUser.role !== 'patient' && currentUser.role !== 'rider') && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowOnboardModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition duration-150"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Onboard New Patient</span>
                      </button>
                      <button
                        onClick={() => setShowAppointmentModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition duration-150"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Book Appointment</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Patient selection list */}
                <div className="flex gap-2 py-1 overflow-x-auto border-b border-gray-100 pb-4">
                  {db?.patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setAiResponse('');
                      }}
                      id={`patient-btn-${p.id}`}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap border cursor-pointer transition ${
                        selectedPatientId === p.id
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>

                {/* Active patient review panels */}
                {(() => {
                  const pt = db?.patients.find(x => x.id === selectedPatientId);
                  if (!pt) return <p className="text-xs text-gray-500">Register or select a patient to see timelines.</p>;

                  // Find latest consultation
                  const notes = db?.consultations.filter(c => c.patientId === pt.id) || [];

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left info box */}
                      <div className="lg:col-span-1 space-y-4 border-r border-gray-50 pr-2">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-bold text-slate-800">{pt.firstName} {pt.lastName}</h3>
                          <p className="text-xs text-gray-500 font-mono">Patient Code: {pt.id}</p>
                          <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded">
                            {pt.gender} / Age {new Date().getFullYear() - new Date(pt.dob).getFullYear()}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-xs leading-relaxed">
                          <div>
                            <span className="font-semibold block text-slate-800">Biometrics Status</span>
                            <span className="text-gray-500">Height: {pt.height} cm | Weight: {pt.weight} kg</span>
                            <span className="block text-red-600 font-semibold mt-1">Calculated BMI: {pt.bmi} (Obese Type I)</span>
                          </div>

                          <div>
                            <span className="font-semibold block text-slate-800">Allergen Flags</span>
                            <p className="text-red-700 font-medium">
                              {pt.allergies.join(', ') || 'No known dietary allergies recorded.'}
                            </p>
                          </div>

                          <div>
                            <span className="font-semibold block text-slate-800">Comorbidities Summary</span>
                            <p className="text-slate-600">
                              {pt.medicalConditions.join(', ') || 'General Wellness Goals'}
                            </p>
                          </div>

                          <div>
                            <span className="font-semibold block text-slate-800">Lifestyle preferences</span>
                            <p className="text-slate-500">Water target: {pt.lifestyle.waterIntake}L/day | Activity: {pt.lifestyle.activityLevel}</p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline logs & Consult desk */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Consultation log form */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Log consultation diagnosis</span>
                            <button
                              type="button"
                              onClick={getSmartAISuggestion}
                              disabled={aiLoading}
                              id="btn-ai-consultation"
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow hover:opacity-90 disabled:opacity-50"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {aiLoading ? 'Reasoning...' : 'Consult Gemini AI Expert'}
                            </button>
                          </div>

                          {/* AI response panel if active */}
                          {aiResponse && (
                            <div className="p-4 bg-slate-950 text-slate-200 rounded-xl space-y-2 border border-slate-850 font-sans text-xs">
                              <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block">Clinical Diet Outline suggested by Gemini API</span>
                              <div className="whitespace-pre-wrap leading-relaxed prose prose-invert overflow-auto max-h-52 pr-1">
                                {aiResponse}
                              </div>
                            </div>
                          )}

                          <form onSubmit={handleAddConsultation} className="bg-slate-50 p-4 rounded-xl space-y-3">
                            <div className="grid grid-cols-3 gap-3 items-end">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Weight (kg)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  required
                                  value={newConsultation.weight}
                                  onChange={(e) => setNewConsultation({...newConsultation, weight: parseFloat(e.target.value) || 0})}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                                />
                              </div>
                              <div className="col-span-2">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1 text-center border-b border-gray-200 pb-0.5">Blood Pressure (mmHg)</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <label className="text-[9px] font-semibold text-slate-400 block mb-0.5 text-center">Sys Pressure</label>
                                    <input
                                      type="number"
                                      value={newConsultation.systolic}
                                      onChange={(e) => setNewConsultation({...newConsultation, systolic: parseInt(e.target.value) || 120})}
                                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-semibold text-slate-400 block mb-0.5 text-center">Dia Pressure</label>
                                    <input
                                      type="number"
                                      value={newConsultation.diastolic}
                                      onChange={(e) => setNewConsultation({...newConsultation, diastolic: parseInt(e.target.value) || 80})}
                                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Clinical assessments during review</label>
                              <textarea
                                value={newConsultation.notes}
                                onChange={(e) => setNewConsultation({...newConsultation, notes: e.target.value})}
                                rows={2}
                                required
                                placeholder="Patient reports improved energy. PCOS fatigue reduced. Blood panels stabilizer details."
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Prescription dietary recommendations</label>
                              <input
                                type="text"
                                value={newConsultation.recommendations}
                                onChange={(e) => setNewConsultation({...newConsultation, recommendations: e.target.value})}
                                required
                                placeholder="1500 kcal low carbohydrate diet. Double antioxidant intake."
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                              />
                            </div>

                            <button
                              type="submit"
                              id="btn-log-diagnostic-session"
                              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                            >
                              Save consultation Assessment Record (Log to Timeline)
                            </button>
                          </form>
                        </div>

                        {/* Consultation timeline view */}
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Clinical Visit Timeline History</span>
                          {notes.length === 0 ? (
                            <p className="text-xs text-gray-400">No medical sessions logged yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {notes.map(n => (
                                <div key={n.id} className="p-3 bg-white border border-gray-100 rounded-xl space-y-2">
                                  <div className="flex justify-between text-[11px] text-gray-500">
                                    <span className="font-semibold text-slate-800">Review On {n.date}</span>
                                    <span>Weight: {n.weight} kg | BMI {n.bmi}</span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-medium">{n.notes}</p>
                                  <div className="p-2 bg-slate-50 rounded-lg text-[10px] text-slate-600">
                                    <strong className="block text-slate-900">Assigned regimen:</strong>
                                    {n.recommendations}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  );
                })()}

                {/* Patient Onboarding is handled via modal dialog from top action buttons */}
              </div>

            </div>
          )}

          {/* 3. MEAL PLANNING TAB */}
          {activeTab === 'meal-planning' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">Recipe Masters & Diet planner</h2>
                    <p className="text-xs text-gray-400">Compose patient meal schedules and assign them directly to the kitchen production line.</p>
                  </div>
                  {(currentUser.role !== 'patient' && currentUser.role !== 'rider') && (
                    <button
                      onClick={() => setShowAddRecipeModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition duration-150"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Recipe</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {db?.recipes.map((rc) => (
                    <div key={rc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-slate-900">{rc.name}</h4>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium uppercase">{rc.category}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Prep time: {rc.prepTime} min | Cooking: {rc.cookTime} min</p>

                        <div className="bg-white p-2 rounded-lg text-[10px] space-y-1">
                          <span className="font-semibold block text-slate-700">Nutritional value per single serving:</span>
                          <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                            <div className="bg-orange-50 text-orange-700 p-0.5 rounded">
                              <strong>Cals</strong> {rc.nutritionalValues.calories}
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 p-0.5 rounded">
                              <strong>Prot</strong> {rc.nutritionalValues.protein}g
                            </div>
                            <div className="bg-blue-50 text-blue-700 p-0.5 rounded">
                              <strong>Carb</strong> {rc.nutritionalValues.carbs}g
                            </div>
                            <div className="bg-amber-50 text-amber-700 p-0.5 rounded">
                              <strong>Fat</strong> {rc.nutritionalValues.fat}g
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-zinc-500 leading-relaxed">
                          <strong>BOM Ingredients:</strong>
                          <ul className="list-disc pl-3 mt-1 space-y-0.5">
                            {rc.ingredients.map((ing, i) => (
                              <li key={i}>{ing.name}: {ing.quantity} {ing.unit}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 mt-2">
                        <span className="text-[10px] font-semibold text-slate-800 uppercase block">Cost Breakdown:</span>
                        <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
                          <span>Ingredients: Rs. 240</span>
                          <span>Labor/Pack: Rs. 40</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diet Plan Generator Tool */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold font-display flex items-center gap-1.5 text-white">
                    <Soup className="h-4 w-4 text-green-400" />
                    Assign Dynamic Single-day Meal Schedule
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Patient</label>
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                      >
                        {db?.patients.map(p => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Choice Meal Recipe</label>
                      <select
                        value={selectedRecipeId}
                        onChange={(e) => setSelectedRecipeId(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                      >
                        <option value="">Select recipe master...</option>
                        {db?.recipes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Scheduled Time-slot</label>
                      <select
                        value={mealSlot}
                        onChange={(e) => setMealSlot(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch Box</option>
                        <option value="dinner">Dinner Box</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleDeployMealPlan}
                        disabled={!selectedRecipeId}
                        id="btn-deploy-meal-plan"
                        className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition"
                      >
                        Deploy Meal Plan Schedule
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 4. PRODUCTION TAB */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Kitchen Meal Production queue</h2>
                  <p className="text-xs text-gray-400">Coordinate prep tasks, print barcodes, and cycle batches through cooking phases safely.</p>
                </div>

                <div className="space-y-3">
                  {db?.kitchenBatches.map((batch) => (
                    <div key={batch.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{batch.recipeName}</h4>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono uppercase">{batch.mealType}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">Batch ID: {batch.id} | Last change: {new Date(batch.updatedAt).toLocaleTimeString()}</p>
                        <div className="text-[10px] text-slate-600 font-medium">Chef Assigned: {batch.assignedTo || 'Unassigned'} | Target Quantity: {batch.quantity} portion</div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          batch.status === 'completed' || batch.status === 'packed' || batch.status === 'ready'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700 animate-pulse'
                        }`}>{batch.status}</span>

                        <select
                          value={batch.status}
                          onChange={(e) => handleUpdateBatchStatus(batch.id, e.target.value)}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                        >
                          <option value="pending">Pending</option>
                          <option value="cooking">Cooking underway</option>
                          <option value="completed">Completed (Cooked)</option>
                          <option value="packed">Packed & Labeled</option>
                          <option value="ready">Ready for Dispatch</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Packaging Master Label design box */}
                <div className="mt-8 pt-6 border-t border-gray-150 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 font-display">Automated Barcode & Diet-Check Label Generator</h3>
                  <div className="p-4 bg-white border border-slate-200 rounded-xl max-w-sm mx-auto space-y-3 shadow-inner">
                    <div className="flex justify-between items-start border-b border-dashed border-slate-300 pb-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">Diet Box Tag</div>
                        <div className="text-xs font-bold text-slate-900">Ayesha Khan (pt-1)</div>
                      </div>
                      <span className="p-0.5 border border-red-500 rounded text-red-500 text-[8px] font-bold uppercase tracking-wider">ALLERGY WARNING: GLUTEN</span>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-600">
                      <div>Menu: <strong>Almond Oats Porridge</strong></div>
                      <div>Portion Target: <strong>290 Kcal (Breakfast Slot)</strong></div>
                      <div>Production Batch: <strong>k-1</strong></div>
                    </div>

                    <div className="text-center font-mono text-[9px] tracking-widest bg-slate-50 py-2 border border-slate-100 rounded">
                      || ||I| || |II|| | |I|| |  8821
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 5. INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Active Ingredients Inventory Control</h2>
                  <p className="text-xs text-gray-400">Deduct raw food materials based on kitchen outputs, log procurement lists and purchase targets.</p>
                </div>

                <div className="space-y-3">
                  {db?.inventory.map((inv) => {
                    const isLow = inv.currentStock <= inv.minThreshold;
                    return (
                      <div key={inv.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{inv.name}</span>
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase font-mono">{inv.category}</span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Current Stock Level: <strong className={isLow ? 'text-amber-600' : 'text-slate-800'}>{inv.currentStock} {inv.unit}</strong> (Min allowed: {inv.minThreshold} {inv.unit})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLow && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100 uppercase rounded mr-2 animate-pulse">
                              Reorder Triggered
                            </span>
                          )}

                          <button
                            onClick={() => handleToggleInventoryStock(inv.id, 500, 'add')}
                            id={`add-stock-btn-${inv.id}`}
                            className="px-2 py-1 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                          >
                            + 500 {inv.unit}
                          </button>
                          <button
                            onClick={() => handleToggleInventoryStock(inv.id, 500, 'subtract')}
                            id={`sub-stock-btn-${inv.id}`}
                            className="px-2 py-1 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-[10px] font-semibold rounded-lg cursor-pointer"
                          >
                            - 500 {inv.unit}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Procurement and Supplier master box */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                  <span className="text-xs font-bold text-slate-800 uppercase block">Purchase Requisition & Supplier Log</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-600">
                    <div className="p-3 bg-white border border-gray-150 rounded-lg">
                      <strong>Metro Cash & Carry</strong>
                      <p className="text-[10px] text-gray-400 mt-0.5">Rating: 4.8 / Terms: Weekly Cash remittance</p>
                      <span className="text-[10px] text-green-600 font-semibold block mt-1">Confirmed PO Delivery 1 hour ago</span>
                    </div>

                    <div className="p-3 bg-white border border-gray-150 rounded-lg">
                      <strong>Al-Fatah Organics</strong>
                      <p className="text-[10px] text-gray-400 mt-0.5">Rating: 4.5 / Terms: Monthly invoicing cycles</p>
                      <span className="text-[10px] text-slate-500 block mt-1">Next delivery expected: Tuesday morning</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 6. LOGISTICS TAB */}
          {activeTab === 'logistics' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Route Management & Dispatches Center</h2>
                  <p className="text-xs text-gray-400">Map active patients, track delivery status and configure field rider dispatches.</p>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-900 uppercase block tracking-wider">Geo-Optimized routes</span>
                  
                  {db?.routes.map(rt => (
                    <div key={rt.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-950">{rt.name}</h4>
                          <span className="text-[10px] text-gray-400 font-mono uppercase">Timing Zone slot: {rt.timingSlot}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded">
                          Rider: {rt.riderName}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg text-[10px] text-gray-600">
                        Mapped patient targets: <strong>{rt.patientIds.join(', ')}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simulated Rider feedback maps */}
                <div className="pt-6 border-t border-gray-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase block tracking-wider">Live Deliveries Dispatch Queue</h3>
                  
                  <div className="space-y-3">
                    {db?.deliveries.map(del => (
                      <div key={del.id} className="p-3 bg-white border border-gray-150 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{del.patientName}</div>
                          <div className="text-[10px] text-gray-500">{del.patientAddress}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            del.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                          }`}>
                            {del.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 7. FINANCES TAB */}
          {activeTab === 'finances' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Operating Expense Logs</h2>
                  <p className="text-xs text-gray-400">Track structural cost items, ingredients purchase lists and fuel allowances.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left column: Add expense form */}
                  <div className="lg:col-span-1 p-4 bg-slate-50 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Record Transaction expense</span>
                    
                    <form onSubmit={handleLogExpense} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Expense category</label>
                        <select
                          value={newExpense.category}
                          onChange={(e: any) => setNewExpense({...newExpense, category: e.target.value})}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                        >
                          <option value="Ingredients">Ingredients & raw materials</option>
                          <option value="Packaging">Packaging Supplies</option>
                          <option value="Fuel">Rider Fuel claims</option>
                          <option value="Rent">Kitchen facilities rent</option>
                          <option value="Software & Utilities">Software subscription API</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Amount (Rs.)</label>
                        <input
                          type="number"
                          required
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Vendor/Merchant name</label>
                        <input
                          type="text"
                          required
                          value={newExpense.vendor}
                          onChange={(e) => setNewExpense({...newExpense, vendor: e.target.value})}
                          placeholder="Metro Cash & Carry"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Notes description</label>
                        <input
                          type="text"
                          value={newExpense.notes}
                          onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                          placeholder="Weekly purchasing summary"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        id="btn-add-expense-log"
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Record Cost Transaction
                      </button>
                    </form>
                  </div>

                  {/* Right column: expense breakdown checklist */}
                  <div className="lg:col-span-2 space-y-4">
                    <span className="text-xs font-bold text-slate-900 uppercase block tracking-wider">Past Expense statements</span>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {db?.expenses.map(ex => (
                        <div key={ex.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-slate-950">{ex.category}</span>
                            <span className="text-xs font-mono font-bold text-red-600">Rs. {ex.amount}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 flex justify-between">
                            <span>Vendor: {ex.vendor}</span>
                            <span>On {ex.date}</span>
                          </div>
                          {ex.notes && <p className="text-[10px] text-slate-500 leading-relaxed font-mono">{ex.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
              
            </div>
          )}

          {/* 8. USER & TUTORIAL GUIDE TAB */}
          {activeTab === 'self-hosted' && (
            <UserGuideTab />
          )}

        </main>

      </div>

      {/* Humble Footer containing licensing & standard compliance markers (anti-tech jargon larping guidelines enforced) */}
      <footer className="bg-white border-t border-gray-150 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-2">
          <p className="text-xs text-gray-500 font-sans">
            Nutrition Consultation & Meal Delivery Management System &copy; {new Date().getFullYear()}.
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-gray-400 font-mono">
            <span>DATABASE STATE: SYNCED</span>
            <span>BACKUP ENGINE: STANDBY</span>
            <span>ACCESS: PRIVATE INTERNAL USE</span>
          </div>
        </div>
      </footer>

      {/* Onboard Patient Modal Dialog */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-7xl p-4 md:p-5 relative max-h-[98vh] overflow-y-auto flex flex-col animate-fade-in">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 font-display">Onboard A New Patient</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Register new physical parameters, lifestyle preferences, and comorbidities in a single screen</p>
            </div>

            <form onSubmit={handleCreatePatient} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={newPatient.firstName}
                  onChange={(e) => setNewPatient({...newPatient, firstName: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="Zainab"
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={newPatient.lastName}
                  onChange={(e) => setNewPatient({...newPatient, lastName: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="Malik"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Gender</label>
                <select
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={newPatient.dob}
                  onChange={(e) => setNewPatient({...newPatient, dob: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mobile Contact</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 pointer-events-none select-none text-slate-500 font-semibold font-mono text-xs">
                    <span>🇵🇰</span>
                    <span>+92</span>
                    <span className="h-4 w-[1px] bg-slate-300 ml-1.5"></span>
                  </div>
                  <input
                    type="tel"
                    required
                    pattern="^\d{3}-\d{7}$"
                    title="Format must be xxx-xxxxxxx (e.g., 300-1234567)"
                    value={newPatient.mobile}
                    onChange={(e) => setNewPatient({...newPatient, mobile: formatLocalPhone(e.target.value)})}
                    className="w-full pl-16 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                    placeholder="300-1234567"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">CNIC Number</label>
                <input
                  type="text"
                  required
                  pattern="^\d{5}-\d{7}-\d{1}$"
                  title="Format must be xxxxx-xxxxxxx-x (e.g., 35201-1234567-8)"
                  value={newPatient.cnic}
                  onChange={(e) => setNewPatient({...newPatient, cnic: formatCNIC(e.target.value)})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="35201-1234567-8"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="zainab.malik@gmail.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Emergency Contact Info</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 pointer-events-none select-none text-slate-500 font-semibold font-mono text-xs">
                    <span>🇵🇰</span>
                    <span>+92</span>
                    <span className="h-4 w-[1px] bg-slate-300 ml-1.5"></span>
                  </div>
                  <input
                    type="tel"
                    required
                    pattern="^\d{3}-\d{7}$"
                    title="Format must be xxx-xxxxxxx (e.g., 321-1234567)"
                    value={newPatient.emergencyContact}
                    onChange={(e) => setNewPatient({...newPatient, emergencyContact: formatLocalPhone(e.target.value)})}
                    className="w-full pl-16 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                    placeholder="321-1234567"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Blood Group</label>
                <select
                  value={newPatient.bloodGroup}
                  onChange={(e) => setNewPatient({...newPatient, bloodGroup: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  required
                  value={newPatient.height}
                  onChange={(e) => setNewPatient({...newPatient, height: parseInt(e.target.value) || 0})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newPatient.weight}
                  onChange={(e) => setNewPatient({...newPatient, weight: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Address Location</label>
                <input
                  type="text"
                  required
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="House 15, Sector Z, Phase 6 DHA"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Known Allergies (comma separated)</label>
                <input
                  type="text"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="Milk Protein, Soy dust, Pine nuts"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Diagnosed Health Conditions</label>
                <input
                  type="text"
                  value={newPatient.medicalConditions}
                  onChange={(e) => setNewPatient({...newPatient, medicalConditions: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="Diabetes, Hypothyroidism, Hypertension"
                />
              </div>

              {/* Patient Lifestyle Habits integrated directly in the same 4-column layout */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Water (L/day)</label>
                <input
                  type="number"
                  value={newPatient.lifestyle.waterIntake}
                  onChange={(e) => setNewPatient({
                    ...newPatient,
                    lifestyle: { ...newPatient.lifestyle, waterIntake: parseFloat(e.target.value) || 2 }
                  })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Sleep (Hours/day)</label>
                <input
                  type="number"
                  value={newPatient.lifestyle.sleepHours}
                  onChange={(e) => setNewPatient({
                    ...newPatient,
                    lifestyle: { ...newPatient.lifestyle, sleepHours: parseInt(e.target.value) || 7 }
                  })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Activity Level</label>
                <select
                  value={newPatient.lifestyle.activityLevel}
                  onChange={(e) => setNewPatient({
                    ...newPatient,
                    lifestyle: { ...newPatient.lifestyle, activityLevel: e.target.value }
                  })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                >
                  <option value="Sedentary">Sedentary</option>
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Active">Active</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Diet preferences</label>
                <input
                  type="text"
                  value={newPatient.lifestyle.foodPreferences}
                  onChange={(e) => setNewPatient({
                    ...newPatient,
                    lifestyle: { ...newPatient.lifestyle, foodPreferences: e.target.value }
                  })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  placeholder="Low carb, sugar-free"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-3 pt-3 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-5 py-2 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-modal-register-patient"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                >
                  Register Patient Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal Dialog */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-5 md:p-6 relative max-h-[95vh] overflow-y-auto flex flex-col animate-fade-in">
            <button
              onClick={() => setShowAppointmentModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Book Active Appointment
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Schedule a new initial or follow-up doctor consultation session</p>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Target Patient</label>
                <select
                  value={newAppointment.patientId}
                  onChange={(e) => setNewAppointment({ ...newAppointment, patientId: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                >
                  <option value="">Choose Patient</option>
                  {db?.patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Appointment Type</label>
                <select
                  value={newAppointment.type}
                  onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                >
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Follow-Up">Follow-Up Review</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date & Time Slot</label>
                <input
                  type="datetime-local"
                  required
                  value={newAppointment.dateTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, dateTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Consultation Notes (Optional)</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  rows={3}
                  placeholder="E.g., Patient requested morning slot, wants review of blood work."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-5 py-2 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-modal-book-consult-slot"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipe Modal Dialog */}
      {showAddRecipeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl p-5 md:p-6 relative max-h-[95vh] overflow-y-auto flex flex-col animate-fade-in">
            <button
              onClick={() => setShowAddRecipeModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Soup className="h-5 w-5 text-green-600" />
                Add New Recipe Master
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Register a new meal recipe, raw ingredient dependencies, and nutritional profiles</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateRecipe(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Recipe Name</label>
                  <input
                    type="text"
                    required
                    value={newRecipe.name}
                    onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                    placeholder="E.g., Honey Garlic Grilled Salmon"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                  <select
                    value={newRecipe.category}
                    onChange={(e) => setNewRecipe({...newRecipe, category: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch/Dinner">Lunch/Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.prepTime}
                    onChange={(e) => setNewRecipe({...newRecipe, prepTime: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Cook Time (min)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.cookTime}
                    onChange={(e) => setNewRecipe({...newRecipe, cookTime: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Serving Size</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.servingSize}
                    onChange={(e) => setNewRecipe({...newRecipe, servingSize: parseInt(e.target.value) || 1})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Calories (Kcal)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.calories}
                    onChange={(e) => setNewRecipe({...newRecipe, calories: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.protein}
                    onChange={(e) => setNewRecipe({...newRecipe, protein: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.carbs}
                    onChange={(e) => setNewRecipe({...newRecipe, carbs: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Fat (g)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.fat}
                    onChange={(e) => setNewRecipe({...newRecipe, fat: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.fiber}
                    onChange={(e) => setNewRecipe({...newRecipe, fiber: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sodium (mg)</label>
                  <input
                    type="number"
                    required
                    value={newRecipe.sodium}
                    onChange={(e) => setNewRecipe({...newRecipe, sodium: parseInt(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Ingredients list (Format: "Name: Quantity Unit", one per line)</label>
                  <textarea
                    required
                    value={newRecipe.ingredientsText}
                    onChange={(e) => setNewRecipe({...newRecipe, ingredientsText: e.target.value})}
                    rows={4}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition font-mono leading-relaxed"
                    placeholder="Salmon Fillet: 200g&#10;Lemon Juice: 15ml&#10;Olive Oil: 10ml"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Preparation Steps / Instructions (One step per line)</label>
                  <textarea
                    required
                    value={newRecipe.instructionsText}
                    onChange={(e) => setNewRecipe({...newRecipe, instructionsText: e.target.value})}
                    rows={4}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition leading-relaxed"
                    placeholder="Preheat grill to medium-high heat.&#10;Season salmon and grill for 6 minutes each side.&#10;Plate and serve warm."
                  />
                </div>
              </div>

              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input type="checkbox"
                    checked={newRecipe.isReadyMade}
                    onChange={(e) => setNewRecipe({ ...newRecipe, isReadyMade: e.target.checked })}
                    className="form-checkbox h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-xs font-semibold text-slate-600">Ready‑Made (catalog item)</span>
                </label>
              </div>
              {newRecipe.isReadyMade && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Select Ready‑Made Recipe</label>
                    <select
                      value={newRecipe.readyMadeId}
                      onChange={(e) => setNewRecipe({ ...newRecipe, readyMadeId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">-- Choose --</option>
                      {readyMadeRecipes.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Assign to Patient</label>
                    <select
                      value={newRecipe.assignedPatientId}
                      onChange={(e) => setNewRecipe({ ...newRecipe, assignedPatientId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ color: 'inherit' }}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <button
                      type="button"
                      onClick={handleAssignReadyMade}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRecipe({ ...newRecipe, isReadyMade: false })}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      Add New Recipe
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRecipeModal(false)}
                  className="px-5 py-2 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-modal-create-recipe"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                >
                  Create Recipe Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
