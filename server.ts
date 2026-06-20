/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { DbState, User, Patient, Recipe, MealPlan, KitchenBatch, InventoryItem, DeliveryRoute, Delivery, OperatingExpense, AuditLog, Appointment, ConsultationNote, Program } from './src/types.js';

// Setup file paths
const DB_FILE = path.join(process.cwd(), 'db.json');

// Initialize base structure if not present
function getInitialDbState(): DbState {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const defaultPatients: Patient[] = [
    {
      id: 'pt-1',
      firstName: 'Ayesha',
      lastName: 'Khan',
      gender: 'Female',
      dob: '1992-04-12',
      cnic: '35201-1234567-8',
      mobile: '+92 300 1234567',
      email: 'ayesha.khan@gmail.com',
      address: 'House 42, Sector Y, DHA Phase 3',
      city: 'Lahore',
      emergencyContact: 'Tariq Khan (+92 321 9876543)',
      height: 165,
      weight: 84.5,
      bmi: 31.0, // Obese
      bloodGroup: 'B+',
      allergies: ['Gluten', 'Peanuts'],
      medicalConditions: ['Hypothyroidism', 'PCOS', 'Obesity Management'],
      lifestyle: {
        activityLevel: 'Sedentary',
        sleepHours: 6,
        waterIntake: 1.5,
        foodPreferences: 'No red meat, prefers organic',
        foodRestrictions: 'Strictly gluten-free'
      },
      status: 'active',
      joinedDate: '2026-05-15'
    },
    {
      id: 'pt-2',
      firstName: 'Zain',
      lastName: 'Ahmed',
      gender: 'Male',
      dob: '1985-08-23',
      cnic: '42201-8765432-1',
      mobile: '+92 333 4567890',
      email: 'zain.ahmed@gmail.com',
      address: 'Apartment 4B, Creek Vista, Phase 8, Clifton',
      city: 'Karachi',
      emergencyContact: 'Fatima Ahmed (+92 300 1122334)',
      height: 178,
      weight: 96.2,
      bmi: 30.4, // Obese
      bloodGroup: 'O+',
      allergies: ['Shellfish'],
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      lifestyle: {
        activityLevel: 'Moderate (Active twice a week)',
        sleepHours: 7,
        waterIntake: 2.2,
        foodPreferences: 'High protein, low carb',
        foodRestrictions: 'Sugar-free'
      },
      status: 'active',
      joinedDate: '2026-06-01'
    }
  ];

  const defaultRecipes: Recipe[] = [
    {
      id: 'rc-1',
      name: 'Keto Herb Grilled Salmon',
      category: 'Lunch/Dinner',
      prepTime: 10,
      cookTime: 15,
      servingSize: 1,
      ingredients: [
        { name: 'Salmon Fillet', quantity: 200, unit: 'g' },
        { name: 'Lemon Juice', quantity: 15, unit: 'ml' },
        { name: 'Olive Oil', quantity: 10, unit: 'ml' },
        { name: 'Fresh Asparagus', quantity: 100, unit: 'g' },
        { name: 'Garlic Powder', quantity: 2, unit: 'g' }
      ],
      nutritionalValues: {
        calories: 380,
        protein: 34,
        carbs: 4,
        fat: 26,
        fiber: 2,
        sodium: 210
      },
      instructions: [
        'Preheat grill to medium-high heat.',
        'Brush salmon with olive oil, lemon juice, and seasonings.',
        'Grill salmon for 5-6 minutes on each side until cooked through.',
        'Toss asparagus in light olive oil and grill for 4 minutes.',
        'Plat and serve.'
      ]
    },
    {
      id: 'rc-2',
      name: 'Low-GI Quinoa Chicken Bowl',
      category: 'Lunch/Dinner',
      prepTime: 15,
      cookTime: 20,
      servingSize: 1,
      ingredients: [
        { name: 'Chicken Breast', quantity: 150, unit: 'g' },
        { name: 'Quinoa', quantity: 60, unit: 'g' },
        { name: 'Broccoli', quantity: 80, unit: 'g' },
        { name: 'Cherry Tomatoes', quantity: 50, unit: 'g' },
        { name: 'Olive Oil Drizzle', quantity: 5, unit: 'ml' }
      ],
      nutritionalValues: {
        calories: 420,
        protein: 38,
        carbs: 44,
        fat: 10,
        fiber: 6,
        sodium: 140
      },
      instructions: [
        'Rinse and boil quinoa in water (1:2 ratio) for 12-15 minutes.',
        'Season chicken breast with herbs and grill till internal temp is 165F.',
        'Steam broccoli for 4 minutes.',
        'Combine cooked quinoa, chopped grilled chicken, steamed broccoli, and fresh tomatoes in a bowl.',
        'Drizzle olive oil and pepper.'
      ]
    },
    {
      id: 'rc-3',
      name: 'Gluten-Free Almond Oats Porridge',
      category: 'Breakfast',
      prepTime: 5,
      cookTime: 7,
      servingSize: 1,
      ingredients: [
        { name: 'Gluten-Free Oats', quantity: 50, unit: 'g' },
        { name: 'Almond Milk', quantity: 200, unit: 'ml' },
        { name: 'Chia Seeds', quantity: 5, unit: 'g' },
        { name: 'Himalayan Salt', quantity: 0.5, unit: 'g' },
        { name: 'Flaked Almonds', quantity: 10, unit: 'g' }
      ],
      nutritionalValues: {
        calories: 290,
        protein: 9,
        carbs: 35,
        fat: 12,
        fiber: 7,
        sodium: 90
      },
      instructions: [
        'Combine gluten-free oats and almond milk in a small saucepan.',
        'Bring to a gentle boil and simmer for 5 minutes, stirring continuously.',
        'Stir in chia seeds.',
        'Pour into a bowl and top with crunchy flaked almonds.'
      ]
    }
  ];

  const defaultInventory: InventoryItem[] = [
    { id: 'inv-1', name: 'Salmon Fillet', category: 'Meat & Poultry', currentStock: 8000, minThreshold: 3000, unit: 'g' },
    { id: 'inv-2', name: 'Chicken Breast', category: 'Meat & Poultry', currentStock: 15000, minThreshold: 5000, unit: 'g' },
    { id: 'inv-3', name: 'Gluten-Free Oats', category: 'Dry Goods', currentStock: 10000, minThreshold: 2000, unit: 'g' },
    { id: 'inv-4', name: 'Almond Milk', category: 'Dairy Products', currentStock: 25000, minThreshold: 5000, unit: 'ml' },
    { id: 'inv-5', name: 'Quinoa', category: 'Dry Goods', currentStock: 12000, minThreshold: 3000, unit: 'g' },
    { id: 'inv-6', name: 'Broccoli', category: 'Vegetables', currentStock: 6000, minThreshold: 2000, unit: 'g' },
    { id: 'inv-7', name: 'Fresh Asparagus', category: 'Vegetables', currentStock: 4000, minThreshold: 1500, unit: 'g' },
    { id: 'inv-8', name: 'Packaging Paper Boxes', category: 'Packaging Materials', currentStock: 500, minThreshold: 100, unit: 'pcs' }
  ];

  const defaultAppointments: Appointment[] = [
    {
      id: 'ap-1',
      patientId: 'pt-1',
      patientName: 'Ayesha Khan',
      type: 'Initial Consultation',
      status: 'completed',
      dateTime: '2026-05-15T10:00:00',
      videoLink: 'https://meet.google.com/abc-defg-hij',
      notes: 'Initial checkup completed. Confirmed Obesity and PCOS concerns. Suggested Weight Loss Meal Plan.'
    },
    {
      id: 'ap-2',
      patientId: 'pt-2',
      patientName: 'Zain Ahmed',
      type: 'Initial Consultation',
      status: 'completed',
      dateTime: '2026-06-01T11:30:00',
      videoLink: 'https://meet.google.com/xyz-qprs-tuv',
      notes: 'Type 2 diabetic patient requiring controlled GI carb diet. Set up 4-week program.'
    },
    {
      id: 'ap-3',
      patientId: 'pt-1',
      patientName: 'Ayesha Khan',
      type: 'Follow-Up',
      status: 'scheduled',
      dateTime: `${todayStr}T14:30:00`,
      videoLink: 'https://meet.google.com/abc-defg-hij',
      notes: 'Review weight reduction and update calorie thresholds.'
    }
  ];

  const defaultConsultations: ConsultationNote[] = [
    {
      id: 'cn-1',
      patientId: 'pt-1',
      date: '2026-05-15',
      weight: 84.5,
      bmi: 31.0,
      systolic: 130,
      diastolic: 85,
      notes: 'Patient struggles with high-GI carbs due to PCOS insulin resistance. Prescribed low carbohydrate and allergen-free custom diet.',
      recommendations: 'Goal is 1500 kcal high protein. Zero gluten, zero peanut exposures. Water intake to exceed 2.5L daily.',
      assignedProgram: 'Weight Loss'
    },
    {
      id: 'cn-2',
      patientId: 'pt-2',
      date: '2026-06-01',
      weight: 96.2,
      bmi: 30.4,
      systolic: 140,
      diastolic: 90,
      notes: 'Diabetic patient needs strict portion size containment. Carbs focused solely on whole grains (Quinoa, oats).',
      recommendations: 'Restrict daily simple sugar to absolute zero. Emphasize organic chicken and steamed greens.',
      assignedProgram: 'Diabetic'
    }
  ];

  const defaultPrograms: Program[] = [
    {
      id: 'prg-1',
      patientId: 'pt-1',
      name: 'Weight Loss Custom Program',
      type: 'Weight Loss',
      startDate: '2026-05-16',
      endDate: '2026-08-16',
      durationWeeks: 12,
      status: 'active',
      nutritionistId: 'nut-1'
    },
    {
      id: 'prg-2',
      patientId: 'pt-2',
      name: 'Type 2 Diabetes Control',
      type: 'Diabetic',
      startDate: '2026-06-02',
      endDate: '2026-07-02',
      durationWeeks: 4,
      status: 'active',
      nutritionistId: 'nut-1'
    }
  ];

  const defaultMealPlans: MealPlan[] = [
    {
      id: 'mp-1',
      patientId: 'pt-1',
      startDate: '2026-05-16',
      endDate: '2026-08-16',
      status: 'active',
      days: [
        {
          date: todayStr,
          meals: {
            breakfast: 'rc-3', // Gluten-Free Oatmeal
            lunch: 'rc-1', // grilled salmon
            dinner: 'rc-2' // Quinoa bowl
          }
        }
      ]
    },
    {
      id: 'mp-2',
      patientId: 'pt-2',
      startDate: '2026-06-02',
      endDate: '2026-07-02',
      status: 'active',
      days: [
        {
          date: todayStr,
          meals: {
            breakfast: 'rc-3',
            lunch: 'rc-2', // Quinoa chicken bowl (low GI)
            dinner: 'rc-1' // Salmon
          }
        }
      ]
    }
  ];

  // Kitchen schedule for today matches plan meals
  const defaultBatches: KitchenBatch[] = [
    {
      id: 'k-1',
      date: todayStr,
      recipeId: 'rc-3',
      recipeName: 'Gluten-Free Almond Oats Porridge',
      quantity: 2, // Ayesha + Zain
      mealType: 'breakfast',
      assignedTo: 'Sajid (Head Chef)',
      status: 'completed',
      updatedAt: `${todayStr}T07:30:00`
    },
    {
      id: 'k-2',
      date: todayStr,
      recipeId: 'rc-1',
      recipeName: 'Keto Herb Grilled Salmon',
      quantity: 2, // Ayesha (lunch) + Zain (dinner)
      mealType: 'lunch',
      assignedTo: 'Aslam (Sous Chef)',
      status: 'packed',
      updatedAt: `${todayStr}T11:15:00`
    },
    {
      id: 'k-3',
      date: todayStr,
      recipeId: 'rc-2',
      recipeName: 'Low-GI Quinoa Chicken Bowl',
      quantity: 2, // Ayesha (dinner) + Zain (lunch)
      mealType: 'dinner',
      assignedTo: 'Sajid (Head Chef)',
      status: 'cooking',
      updatedAt: `${todayStr}T12:00:00`
    }
  ];

  const defaultRoutes: DeliveryRoute[] = [
    {
      id: 'rt-1',
      name: 'Route A: Clifton & DHA Phase 3 (Morning/Midday)',
      timingSlot: 'morning',
      riderId: 'rd-1',
      riderName: 'Faisal Majeed',
      patientIds: ['pt-1', 'pt-2']
    }
  ];

  const defaultDeliveries: Delivery[] = [
    {
      id: 'dl-1',
      date: todayStr,
      patientId: 'pt-1',
      patientName: 'Ayesha Khan',
      patientAddress: 'House 42, Sector Y, DHA Phase 3',
      patientPhone: '+92 300 1234567',
      routeId: 'rt-1',
      routeName: 'Route A: Clifton & DHA Phase 3',
      riderId: 'rd-1',
      riderName: 'Faisal Majeed',
      mealType: 'Breakfast & Lunch Box',
      status: 'delivered',
      proofOfDelivery: {
        method: 'otp',
        otpCode: '8821',
        verifiedOtp: true,
        gpsLatitude: 31.47,
        gpsLongitude: 74.38,
        timestamp: `${todayStr}T08:45:00`
      } as any,
      scheduledSlot: 'Breakfast'
    },
    {
      id: 'dl-2',
      date: todayStr,
      patientId: 'pt-2',
      patientName: 'Zain Ahmed',
      patientAddress: 'Apartment 4B, Creek Vista, Phase 8, Clifton',
      patientPhone: '+92 333 4567890',
      routeId: 'rt-1',
      routeName: 'Route A: Clifton & DHA Phase 3',
      riderId: 'rd-1',
      riderName: 'Faisal Majeed',
      mealType: 'Weight Control Lunch Box',
      status: 'in_transit',
      proofOfDelivery: {
        method: 'otp',
        otpCode: '4190',
        verifiedOtp: false,
        timestamp: ''
      } as any,
      scheduledSlot: 'Lunch'
    }
  ];

  const defaultExpenses: OperatingExpense[] = [
    { id: 'ex-1', category: 'Ingredients', amount: 4850, date: todayStr, paymentMethod: 'Cash', vendor: 'Metro Cash & Carry', notes: 'Weekly raw vegetables & chicken breast purchase' },
    { id: 'ex-2', category: 'Fuel', amount: 1540, date: todayStr, paymentMethod: 'Card', vendor: 'PSO Clifton', notes: 'Rider daily fuel claims' },
    { id: 'ex-3', category: 'Rent', amount: 80000, date: '2026-06-01', paymentMethod: 'Bank Transfer', vendor: 'Siddique Commercial Prop', notes: 'Kitchen facility lease' }
  ];

  const defaultAuditLogs: AuditLog[] = [
    { id: 'log-1', timestamp: `${todayStr}T09:00:00`, userId: 'usr-admin', userName: 'Private System', userRole: 'admin', action: 'System Init', details: 'Private Self-hosted DB successfully deployed.' }
  ];

  return {
    patients: defaultPatients,
    appointments: defaultAppointments,
    consultations: defaultConsultations,
    programs: defaultPrograms,
    recipes: defaultRecipes,
    mealPlans: defaultMealPlans,
    kitchenBatches: defaultBatches,
    inventory: defaultInventory,
    purchaseOrders: [],
    routes: defaultRoutes,
    deliveries: defaultDeliveries,
    expenses: defaultExpenses,
    auditLogs: defaultAuditLogs
  };
}

// Global mutable database in-memory state
let dbState: DbState;

// Sync read-write storage
function loadDatabase(): DbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const p = fs.readFileSync(DB_FILE, 'utf8');
      dbState = JSON.parse(p);
    } else {
      dbState = getInitialDbState();
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2));
    }
  } catch (error) {
    console.error('Database load failed, returning defaults', error);
    dbState = getInitialDbState();
  }
  return dbState;
}

function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2));
  } catch (error) {
    console.error('Failed to save database file', error);
  }
}

// Run initial load
loadDatabase();

// Lazy Gemini AI Init
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup sample users
  const STABLE_USERS: User[] = [
    { id: 'usr-admin', name: 'Private Admin', email: 'admin@selfhosted.local', role: 'admin' },
    { id: 'usr-owner', name: 'Business Owner', email: 'owner@selfhosted.local', role: 'owner' },
    { id: 'usr-nut', name: 'Dr. Sarah (Nutritionist)', email: 'sarah@selfhosted.local', role: 'nutritionist' },
    { id: 'usr-kitchen', name: 'Master Chef Sajid', email: 'sajid@selfhosted.local', role: 'kitchen' },
    { id: 'usr-dispatch', name: 'Logistics Lead', email: 'dispatch@selfhosted.local', role: 'dispatcher' },
    { id: 'usr-rider', name: 'Faisal Majeed (Rider)', email: 'rider@selfhosted.local', role: 'rider' },
    { id: 'usr-patient', name: 'Ayesha Khan (Patient)', email: 'ayesha@selfhosted.local', role: 'patient' }
  ];

  const logAudit = (userId: string, action: string, details: string) => {
    const user = STABLE_USERS.find(u => u.id === userId) || { name: 'Unknown User', role: 'guest' };
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId,
      userName: user.name,
      userRole: user.role,
      action,
      details
    };
    dbState.auditLogs.unshift(newLog);
    saveDatabase();
  };

  // REST API Endpoints

  // 1. Authenticate user
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    // For local private selfhosted context we allow login for any predefined role using pre-configured user emails
    const targetUser = STABLE_USERS.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (targetUser) {
      logAudit(targetUser.id, 'User Login', `Successfully logged inside console with role ${targetUser.role}`);
      res.json({ success: true, user: targetUser });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials. User not found inside private selfhosted users.' });
    }
  });

  // 2. Backup & Restore (Download exact file, upload exact state verification)
  app.get('/api/backup', (req, res) => {
    res.setHeader('Content-disposition', `attachment; filename=erp_selfhosted_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(dbState, null, 2));
  });

  app.post('/api/restore', (req, res) => {
    try {
      const incomingState = req.body;
      if (incomingState && Array.isArray(incomingState.patients) && Array.isArray(incomingState.recipes)) {
        dbState = {
          patients: incomingState.patients || [],
          appointments: incomingState.appointments || [],
          consultations: incomingState.consultations || [],
          programs: incomingState.programs || [],
          recipes: incomingState.recipes || [],
          mealPlans: incomingState.mealPlans || [],
          kitchenBatches: incomingState.kitchenBatches || [],
          inventory: incomingState.inventory || [],
          purchaseOrders: incomingState.purchaseOrders || [],
          routes: incomingState.routes || [],
          deliveries: incomingState.deliveries || [],
          expenses: incomingState.expenses || [],
          auditLogs: incomingState.auditLogs || []
        };
        saveDatabase();
        logAudit('usr-admin', 'Import Backup', 'Database restore completed successfully through panel upload.');
        res.json({ success: true, message: 'Database state successfully restored and validated.' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid database backup scheme format constraints failed.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to restore state file: ' + err.message });
    }
  });

  // 3. Patients CRUD
  app.get('/api/patients', (req, res) => {
    res.json(dbState.patients);
  });

  app.post('/api/patients', (req, res) => {
    const freshPatient: Patient = {
      ...req.body,
      id: 'pt-' + Date.now(),
      joinedDate: new Date().toISOString().split('T')[0]
    };
    dbState.patients.unshift(freshPatient);
    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Create Patient', `Registered patient ${freshPatient.firstName} ${freshPatient.lastName}`);
    res.json(freshPatient);
  });

  app.put('/api/patients/:id', (req, res) => {
    const { id } = req.params;
    const idx = dbState.patients.findIndex(p => p.id === id);
    if (idx !== -1) {
      dbState.patients[idx] = { ...dbState.patients[idx], ...req.body };
      saveDatabase();
      logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Update Patient', `Updated patient records for ID: ${id}`);
      res.json(dbState.patients[idx]);
    } else {
      res.status(404).json({ message: 'Patient high integrity record not found' });
    }
  });

  // 4. Recipes Master API
  app.get('/api/recipes', (req, res) => {
    res.json(dbState.recipes);
  });

  app.post('/api/recipes', (req, res) => {
    const recipe: Recipe = {
      ...req.body,
      id: 'rc-' + Date.now()
    };
    dbState.recipes.push(recipe);
    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Add Recipe', `Created new Recipe item ${recipe.name}`);
    res.json(recipe);
  });

  // 5. Active Meal Plans
  app.get('/api/meal-plans', (req, res) => {
    res.json(dbState.mealPlans);
  });

  app.post('/api/meal-plans', (req, res) => {
    const mealPlan: MealPlan = {
      ...req.body,
      id: 'mp-' + Date.now()
    };
    
    // Automatically trigger kitchen batches creation from the meal plan days
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPlan = mealPlan.days.find(d => d.date === todayStr);
    
    if (todayPlan) {
      // Loop over slot assignments
      const slots = Object.entries(todayPlan.meals);
      slots.forEach(([slotType, recipeId]) => {
        if (recipeId) {
          const recipe = dbState.recipes.find(r => r.id === recipeId);
          if (recipe) {
            // Deduct ingredients from Inventory based on recipe BOM! (This is real recipe-based consumption calculation)
            recipe.ingredients.forEach(ing => {
              const invItem = dbState.inventory.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
              if (invItem) {
                invItem.currentStock = Math.max(0, invItem.currentStock - ing.quantity);
              }
            });

            // Create kitchen batch
            const newBatch: KitchenBatch = {
              id: 'k-' + Date.now() + Math.random().toString(36).substr(2, 4),
              date: todayStr,
              recipeId,
              recipeName: recipe.name,
              quantity: 1,
              mealType: slotType as any,
              status: 'pending',
              updatedAt: new Date().toISOString()
            };
            dbState.kitchenBatches.push(newBatch);
          }
        }
      });
    }

    dbState.mealPlans.push(mealPlan);
    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Deploy Meal Plan', `Activated meal plan for patient ID: ${mealPlan.patientId}`);
    res.json(mealPlan);
  });

  // 6. Appointments & Consultations
  app.get('/api/appointments', (req, res) => {
    res.json(dbState.appointments);
  });

  app.post('/api/appointments', (req, res) => {
    const apt: Appointment = {
      ...req.body,
      id: 'ap-' + Date.now(),
      status: 'scheduled'
    };
    dbState.appointments.push(apt);
    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Schedule Appointment', `Booked appointment for passenger: ${apt.patientName}`);
    res.json(apt);
  });

  app.put('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const index = dbState.appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      dbState.appointments[index] = { ...dbState.appointments[index], ...req.body };
      saveDatabase();
      res.json(dbState.appointments[index]);
    } else {
      res.status(404).send('Not Found');
    }
  });

  app.get('/api/consultations', (req, res) => {
    res.json(dbState.consultations);
  });

  app.post('/api/consultations', (req, res) => {
    const rawNote = req.body;
    const consult: ConsultationNote = {
      ...rawNote,
      id: 'cn-' + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    dbState.consultations.push(consult);

    // Also update patient height/weight/BMI record
    const patientIdx = dbState.patients.findIndex(p => p.id === consult.patientId);
    if (patientIdx !== -1) {
      dbState.patients[patientIdx].weight = consult.weight;
      dbState.patients[patientIdx].bmi = consult.bmi;
    }

    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Conduct Consultation', `Saved prescription session feedback for pt-${consult.patientId}`);
    res.json(consult);
  });

  // 7. Kitchen Batches CRUD
  app.get('/api/production/batches', (req, res) => {
    res.json(dbState.kitchenBatches);
  });

  app.put('/api/production/batches/:id', (req, res) => {
    const { id } = req.params;
    const idx = dbState.kitchenBatches.findIndex(k => k.id === id);
    if (idx !== -1) {
      dbState.kitchenBatches[idx] = {
        ...dbState.kitchenBatches[idx],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      saveDatabase();
      logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Cook Stage Transition', `Changed batch status ${id} to ${req.body.status}`);
      res.json(dbState.kitchenBatches[idx]);
    } else {
      res.status(404).send('Batch not found');
    }
  });

  // 8. Inventory CRUD
  app.get('/api/inventory', (req, res) => {
    res.json(dbState.inventory);
  });

  app.post('/api/inventory', (req, res) => {
    const ingredient: InventoryItem = {
      ...req.body,
      id: 'inv-' + Date.now()
    };
    dbState.inventory.push(ingredient);
    saveDatabase();
    res.json(ingredient);
  });

  app.post('/api/inventory/adjust', (req, res) => {
    const { itemId, amount, type } = req.body; // type: 'add' or 'subtract'
    const match = dbState.inventory.find(i => i.id === itemId);
    if (match) {
      if (type === 'add') {
        match.currentStock += amount;
      } else {
        match.currentStock = Math.max(0, match.currentStock - amount);
      }
      saveDatabase();
      logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Stock Adjustment', `Adjusted inventory quantity for ${match.name} values changed.`);
      res.json({ success: true, item: match });
    } else {
      res.status(404).send('Inventory item not found');
    }
  });

  // 9. Deliveries & Routes
  app.get('/api/routes', (req, res) => {
    res.json(dbState.routes);
  });

  app.get('/api/deliveries', (req, res) => {
    res.json(dbState.deliveries);
  });

  app.post('/api/deliveries', (req, res) => {
    const delv: Delivery = {
      ...req.body,
      id: 'dl-' + Date.now(),
      status: 'assigned'
    };
    dbState.deliveries.push(delv);
    saveDatabase();
    res.json(delv);
  });

  app.put('/api/deliveries/:id', (req, res) => {
    const { id } = req.params;
    const idx = dbState.deliveries.findIndex(d => d.id === id);
    if (idx !== -1) {
      dbState.deliveries[idx] = {
        ...dbState.deliveries[idx],
        ...req.body
      };
      saveDatabase();
      res.json(dbState.deliveries[idx]);
    } else {
      res.status(404).send('Delivery record not found');
    }
  });

  // 10. Expenses CRUD
  app.get('/api/expenses', (req, res) => {
    res.json(dbState.expenses);
  });

  app.post('/api/expenses', (req, res) => {
    const expense: OperatingExpense = {
      ...req.body,
      id: 'ex-' + Date.now()
    };
    dbState.expenses.unshift(expense);
    saveDatabase();
    logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Record Expense', `Added transaction cost of ${expense.amount} under ${expense.category}`);
    res.json(expense);
  });

  // 11. Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    res.json(dbState.auditLogs);
  });

  // 12. Smart AI Suggestion utilizing Gemini API (from server side only)
  app.post('/api/ai/suggest-plan', async (req, res) => {
    const { patientName, conditions, dietPreferences, weight, bmi, targetGoal } = req.body;

    const ai = getGemini();
    if (!ai) {
      // Graceful fallback if API key is not present or default is active
      return res.json({
        success: true,
        isFallback: true,
        text: `### Nutrition Suggestion Plan for ${patientName} (Local Engine Fallback Mode)
- **Goal:** ${targetGoal || 'Weight Optimization'}
- **Patient Metrics:** Weight ${weight} kg, BMI ${bmi} (Status: Heavy/Pre-diabetic)
- **Allergies & Restrictions:** ${conditions.join(', ') || 'None'} (${dietPreferences})

#### Suggested Meal Focus
1. **Low Glycemic Quinoa Porridge** with Almond milk and anti-inflammatory flax seeds as breakfast.
2. **Fresh Grilled Herb Salmon** paired with high-fiber asparagus spears to slow carbohydrates absorption.
3. **Daily Water Target:** 2.8 Liters to clear PCOS system toxin thresholds.

*(Configure a real GEMINI_API_KEY in Settings > Secrets to unlock live deep-learning reasoning output)*`
      });
    }

    try {
      const systemPrompt = `You are an elite clinical nutritionist and expert private Chef. Create a targeted, concise daily nutrition plan outline for a patient.
Return the output using beautiful Markdown formatting. Specialize advice according to the patient's BMI and medical profile. Specify a breakfast, lunch, and dinner recipe recommendation from our base master elements (Salmon, Chicken Quinoa bowl, or Almond porridge) paired with custom high-nutritious toppings.`;

      const userMessage = `Patient Name: ${patientName}
Height/Weight/BMI: weight ${weight} kg, BMI ${bmi}
Diagnosed Conditions: ${conditions.join(', ') || 'General Wellness Goals'}
Patient Restrictions & Preferences: ${dietPreferences}
Primary Targets Wanted: ${targetGoal || 'Fat loss and PCOS glycemic management'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });

      res.json({
        success: true,
        isFallback: false,
        text: response.text
      });
    } catch (err: any) {
      console.error('Gemini call failed:', err);
      res.status(500).json({ success: false, message: 'AI Engine error: ' + err.message });
    }
  });

  // Live reload configuration check
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Selfhosted Nutrition ERP Backend Running on http://localhost:${PORT}`);
  });
}

startServer();
