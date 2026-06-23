/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import pg from 'pg';
import dotenv from 'dotenv';
import { DbState, User, Patient, Recipe, MealPlan, KitchenBatch, InventoryItem, DeliveryRoute, Delivery, OperatingExpense, AuditLog, Appointment, ConsultationNote, Program } from './src/types.js';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper functions for key transformation
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Ensure database name is converted to CamelCase for JS objects
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapRowKeys(row: any, keyMapper: (s: string) => string): any {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const newRow: any = {};
  for (const key of Object.keys(row)) {
    newRow[keyMapper(key)] = row[key];
  }
  return newRow;
}

// Database helper execution pools
async function dbSelect(sql: string, params: any[] = []) {
  const res = await pool.query(sql, params);
  return res.rows.map(row => mapRowKeys(row, toCamelCase));
}

async function dbSelectOne(sql: string, params: any[] = []) {
  const rows = await dbSelect(sql, params);
  return rows[0] || null;
}

async function dbInsert(tableName: string, record: any) {
  const snakeRecord = mapRowKeys(record, toSnakeCase);
  const keys = Object.keys(snakeRecord);
  const values = Object.values(snakeRecord).map(val => 
    typeof val === 'object' && val !== null ? JSON.stringify(val) : val
  );
  
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.map(k => `"${k}"`).join(', ');
  
  const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
  const res = await pool.query(sql, values);
  return mapRowKeys(res.rows[0], toCamelCase);
}

async function dbUpdate(tableName: string, id: string, record: any) {
  const snakeRecord = mapRowKeys(record, toSnakeCase);
  delete snakeRecord.id;
  const keys = Object.keys(snakeRecord);
  if (keys.length === 0) {
    return dbSelectOne(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
  }
  const values = Object.values(snakeRecord).map(val => 
    typeof val === 'object' && val !== null ? JSON.stringify(val) : val
  );
  
  const assignments = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const sql = `UPDATE ${tableName} SET ${assignments} WHERE id = $${keys.length + 1} RETURNING *`;
  const res = await pool.query(sql, [...values, id]);
  return mapRowKeys(res.rows[0], toCamelCase);
}

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

// Auto verification and DB generation utility
async function ensureDatabaseExists() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  
  const matches = dbUrl.match(/\/([^\/?]+)(?:\?.*)?$/);
  const targetDb = matches ? matches[1] : 'nutrition_erp';
  
  const defaultDbUrl = dbUrl.replace(/\/([^\/?]+)((?:\?.*)?)$/, '/postgres$2');
  
  const client = new pg.Client({ connectionString: defaultDbUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (res.rowCount === 0) {
      console.log(`Database "${targetDb}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database "${targetDb}" created successfully.`);
    }
  } catch (err) {
    console.error(`Warning: could not verify or create database "${targetDb}":`, err);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

// Global database schema and seeding script
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        gender VARCHAR(50) NOT NULL,
        dob VARCHAR(50) NOT NULL,
        cnic VARCHAR(50) NOT NULL,
        photo_url TEXT,
        mobile VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        emergency_contact TEXT NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        bmi REAL NOT NULL,
        blood_group VARCHAR(10) NOT NULL,
        allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
        medical_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
        lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL,
        joined_date VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        date_time VARCHAR(100) NOT NULL,
        video_link TEXT,
        voice_link TEXT,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        weight REAL NOT NULL,
        bmi REAL NOT NULL,
        systolic REAL,
        diastolic REAL,
        notes TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        assigned_program VARCHAR(100)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        duration_weeks INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        nutritionist_id VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        prep_time INT NOT NULL,
        cook_time INT NOT NULL,
        serving_size INT NOT NULL,
        ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
        nutritional_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        instructions JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        days JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kitchen_batches (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        recipe_id VARCHAR(50) NOT NULL,
        recipe_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        meal_type VARCHAR(50) NOT NULL,
        assigned_to VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        updated_at VARCHAR(100) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        current_stock REAL NOT NULL,
        min_threshold REAL NOT NULL,
        unit VARCHAR(50) NOT NULL,
        batch_and_expiry JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        supplier_name VARCHAR(255) NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_amount REAL NOT NULL,
        status VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        delivery_date VARCHAR(50)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timing_slot VARCHAR(50) NOT NULL,
        rider_id VARCHAR(50),
        rider_name VARCHAR(255),
        patient_ids JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        patient_id VARCHAR(50) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        patient_address TEXT NOT NULL,
        patient_phone VARCHAR(50) NOT NULL,
        route_id VARCHAR(50) NOT NULL,
        route_name VARCHAR(255) NOT NULL,
        rider_id VARCHAR(50) NOT NULL,
        rider_name VARCHAR(255) NOT NULL,
        meal_type VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        proof_of_delivery JSONB,
        exception_notes TEXT,
        scheduled_slot VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        amount REAL NOT NULL,
        date VARCHAR(50) NOT NULL,
        payment_method VARCHAR(100) NOT NULL,
        vendor VARCHAR(255) NOT NULL,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp VARCHAR(100) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT NOT NULL
      );
    `);

    await client.query('COMMIT');

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) === 0) {
      console.log('PostgreSQL database is empty. Seeding initial values...');
      
      const STABLE_USERS = [
        { id: 'usr-admin', name: 'Private Admin', email: 'admin@selfhosted.local', role: 'admin' },
        { id: 'usr-owner', name: 'Business Owner', email: 'owner@selfhosted.local', role: 'owner' },
        { id: 'usr-nut', name: 'Dr. Sarah (Nutritionist)', email: 'sarah@selfhosted.local', role: 'nutritionist' },
        { id: 'usr-kitchen', name: 'Master Chef Sajid', email: 'sajid@selfhosted.local', role: 'kitchen' },
        { id: 'usr-dispatch', name: 'Logistics Lead', email: 'dispatch@selfhosted.local', role: 'dispatcher' },
        { id: 'usr-rider', name: 'Faisal Majeed (Rider)', email: 'rider@selfhosted.local', role: 'rider' },
        { id: 'usr-patient', name: 'Ayesha Khan (Patient)', email: 'ayesha@selfhosted.local', role: 'patient' }
      ];

      for (const u of STABLE_USERS) {
        await dbInsert('users', u);
      }

      const defaults = getInitialDbState();

      for (const p of defaults.patients) await dbInsert('patients', p);
      for (const r of defaults.recipes) await dbInsert('recipes', r);
      for (const i of defaults.inventory) await dbInsert('inventory', i);
      for (const a of defaults.appointments) await dbInsert('appointments', a);
      for (const c of defaults.consultations) await dbInsert('consultations', c);
      for (const prg of defaults.programs) await dbInsert('programs', prg);
      for (const mp of defaults.mealPlans) await dbInsert('meal_plans', mp);
      for (const k of defaults.kitchenBatches) await dbInsert('kitchen_batches', k);
      for (const rt of defaults.routes) await dbInsert('routes', rt);
      for (const d of defaults.deliveries) await dbInsert('deliveries', d);
      for (const ex of defaults.expenses) await dbInsert('expenses', ex);
      for (const log of defaults.auditLogs) await dbInsert('audit_logs', log);

      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database migrations failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

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
  const PORT = parseInt(process.env.PORT || '3009', 10);

  app.use(express.json());

  // Connect & Initialize PostgreSQL database
  try {
    await ensureDatabaseExists();
    await initializeDatabase();
    console.log('Database successfully initialized.');
  } catch (err) {
    console.error('Could not boot database. Check your DATABASE_URL configuration.');
    console.error(err);
    process.exit(1);
  }

  const logAudit = async (userId: string, action: string, details: string) => {
    try {
      const user = await dbSelectOne('SELECT * FROM users WHERE id = $1', [userId]) || { name: 'Unknown User', role: 'guest' };
      const newLog = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        userId,
        userName: user.name,
        userRole: user.role,
        action,
        details
      };
      await dbInsert('audit_logs', newLog);
    } catch (err) {
      console.error('Failed to log audit statement:', err);
    }
  };

  // REST API Endpoints

  // 1. Authenticate user
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const targetUser = await dbSelectOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [(email || '').trim()]);
      if (targetUser) {
        await logAudit(targetUser.id, 'User Login', `Successfully logged inside console with role ${targetUser.role}`);
        res.json({ success: true, user: targetUser });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found inside private selfhosted users.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Backup & Restore (Download exact database, restore exact state)
  app.get('/api/backup', async (req, res) => {
    try {
      const state: DbState = {
        patients: await dbSelect('SELECT * FROM patients'),
        appointments: await dbSelect('SELECT * FROM appointments'),
        consultations: await dbSelect('SELECT * FROM consultations'),
        programs: await dbSelect('SELECT * FROM programs'),
        recipes: await dbSelect('SELECT * FROM recipes'),
        mealPlans: await dbSelect('SELECT * FROM meal_plans'),
        kitchenBatches: await dbSelect('SELECT * FROM kitchen_batches'),
        inventory: await dbSelect('SELECT * FROM inventory'),
        purchaseOrders: await dbSelect('SELECT * FROM purchase_orders'),
        routes: await dbSelect('SELECT * FROM routes'),
        deliveries: await dbSelect('SELECT * FROM deliveries'),
        expenses: await dbSelect('SELECT * FROM expenses'),
        auditLogs: await dbSelect('SELECT * FROM audit_logs')
      };
      res.setHeader('Content-disposition', `attachment; filename=erp_selfhosted_backup_${new Date().toISOString().split('T')[0]}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(state, null, 2));
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/restore', async (req, res) => {
    const client = await pool.connect();
    try {
      const incomingState = req.body;
      if (incomingState && Array.isArray(incomingState.patients) && Array.isArray(incomingState.recipes)) {
        await client.query('BEGIN');
        
        const tables = [
          'patients', 'appointments', 'consultations', 'programs', 'recipes',
          'meal_plans', 'kitchen_batches', 'inventory', 'purchase_orders',
          'routes', 'deliveries', 'expenses', 'audit_logs'
        ];
        for (const t of tables) {
          await client.query(`TRUNCATE TABLE ${t} CASCADE`);
        }
        
        await client.query('COMMIT');
        
        for (const p of incomingState.patients || []) await dbInsert('patients', p);
        for (const a of incomingState.appointments || []) await dbInsert('appointments', a);
        for (const c of incomingState.consultations || []) await dbInsert('consultations', c);
        for (const prg of incomingState.programs || []) await dbInsert('programs', prg);
        for (const r of incomingState.recipes || []) await dbInsert('recipes', r);
        for (const mp of incomingState.mealPlans || []) await dbInsert('meal_plans', mp);
        for (const k of incomingState.kitchenBatches || []) await dbInsert('kitchen_batches', k);
        for (const i of incomingState.inventory || []) await dbInsert('inventory', i);
        for (const po of incomingState.purchaseOrders || []) await dbInsert('purchase_orders', po);
        for (const rt of incomingState.routes || []) await dbInsert('routes', rt);
        for (const d of incomingState.deliveries || []) await dbInsert('deliveries', d);
        for (const ex of incomingState.expenses || []) await dbInsert('expenses', ex);
        for (const log of incomingState.auditLogs || []) await dbInsert('audit_logs', log);

        await logAudit('usr-admin', 'Import Backup', 'Database restore completed successfully through panel upload.');
        res.json({ success: true, message: 'Database state successfully restored and validated.' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid database backup scheme format constraints failed.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to restore state file: ' + err.message });
    } finally {
      client.release();
    }
  });

  // 3. Patients CRUD
  app.get('/api/patients', async (req, res) => {
    try {
      const patients = await dbSelect('SELECT * FROM patients ORDER BY joined_date DESC');
      res.json(patients);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/patients', async (req, res) => {
    try {
      const freshPatient = {
        ...req.body,
        id: 'pt-' + Date.now(),
        joinedDate: new Date().toISOString().split('T')[0]
      };
      const inserted = await dbInsert('patients', freshPatient);
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Create Patient', `Registered patient ${freshPatient.firstName} ${freshPatient.lastName}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await dbUpdate('patients', id, req.body);
      if (updated) {
        await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Update Patient', `Updated patient records for ID: ${id}`);
        res.json(updated);
      } else {
        res.status(404).json({ message: 'Patient record not found' });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 4. Recipes Master API
  app.get('/api/recipes', async (req, res) => {
    try {
      const recipes = await dbSelect('SELECT * FROM recipes');
      res.json(recipes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/recipes', async (req, res) => {
    try {
      const recipe = {
        ...req.body,
        id: 'rc-' + Date.now()
      };
      const inserted = await dbInsert('recipes', recipe);
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Add Recipe', `Created new Recipe item ${recipe.name}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // -------------------------------------------------
  // 5b. Ready‑Made Catalog & Assignment Endpoints
  // -------------------------------------------------
  /**
   * GET /api/readyMadeRecipes
   * Returns a static list of ready‑made recipe templates.
   * In a real system this would come from a DB table.
   */
  app.get('/api/readyMadeRecipes', async (req, res) => {
    // Sample catalog – you can replace this with a DB fetch later.
    const catalog = [
      { id: 'rm-1', name: 'Keto Herb Grilled Salmon', category: 'Lunch/Dinner' },
      { id: 'rm-2', name: 'Low‑GI Quinoa Chicken Bowl', category: 'Lunch/Dinner' },
      { id: 'rm-3', name: 'Gluten‑Free Almond Oats Porridge', category: 'Breakfast' },
    ];
    res.json(catalog);
  });

  /**
   * POST /api/assignReadyMade
   * Assigns a ready‑made recipe to a patient.
   * Creates a new recipe record (copy of the template) and logs the assignment.
   */
  app.post('/api/assignReadyMade', async (req, res) => {
    const { readyMadeId, patientId } = req.body;
    if (!readyMadeId || !patientId) {
      return res.status(400).json({ message: 'readyMadeId and patientId are required' });
    }
    try {
      // 1️⃣ Find the template (in a real DB you’d query a `ready_made_recipes` table)
      const templates = [
        { id: 'rm-1', name: 'Keto Herb Grilled Salmon', category: 'Lunch/Dinner', ingredients: [] },
        { id: 'rm-2', name: 'Low‑GI Quinoa Chicken Bowl', category: 'Lunch/Dinner', ingredients: [] },
        { id: 'rm-3', name: 'Gluten‑Free Almond Oats Porridge', category: 'Breakfast', ingredients: [] },
      ];
      const tmpl = templates.find(t => t.id === readyMadeId);
      if (!tmpl) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // 2️⃣ Build a new recipe object containing only columns that exist in the `recipes` table
      const newRecipe = {
        id: 'rc-' + Date.now(),
        name: tmpl.name,
        category: tmpl.category,
        prep_time: 0,
        cook_time: 0,
        serving_size: 1,
        ingredients: tmpl.ingredients || [],
        nutritional_values: {},
        instructions: []
      };
      // Insert only the allowed fields (dbInsert will map keys to snake_case automatically)
      const inserted = await dbInsert('recipes', newRecipe);

      // 3️⃣ Log the assignment (you may also store the relationship elsewhere later)
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin',
        'Assign Ready‑Made Recipe',
        `Assigned ${tmpl.name} to patient ${patientId}`);

      res.json(inserted);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });


  // 5. Active Meal Plans
  app.get('/api/meal-plans', async (req, res) => {
    try {
      const mealPlans = await dbSelect('SELECT * FROM meal_plans');
      res.json(mealPlans);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/meal-plans', async (req, res) => {
    try {
      const mealPlan = {
        ...req.body,
        id: 'mp-' + Date.now()
      };
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPlan = mealPlan.days.find((d: any) => d.date === todayStr);
      
      if (todayPlan) {
        const slots = Object.entries(todayPlan.meals);
        for (const [slotType, recipeId] of slots) {
          if (recipeId) {
            const recipe = await dbSelectOne('SELECT * FROM recipes WHERE id = $1', [recipeId]);
            if (recipe) {
              const ingredients = recipe.ingredients || [];
              for (const ing of ingredients) {
                const invItem = await dbSelectOne('SELECT * FROM inventory WHERE LOWER(name) = LOWER($1)', [ing.name]);
                if (invItem) {
                  const newStock = Math.max(0, invItem.currentStock - ing.quantity);
                  await dbUpdate('inventory', invItem.id, { currentStock: newStock });
                }
              }

              const newBatch = {
                id: 'k-' + Date.now() + Math.random().toString(36).substr(2, 4),
                date: todayStr,
                recipeId,
                recipeName: recipe.name,
                quantity: 1,
                mealType: slotType,
                status: 'pending',
                updatedAt: new Date().toISOString()
              };
              await dbInsert('kitchen_batches', newBatch);
            }
          }
        }
      }

      const inserted = await dbInsert('meal_plans', mealPlan);
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Deploy Meal Plan', `Activated meal plan for patient ID: ${mealPlan.patientId}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 6. Appointments & Consultations
  app.get('/api/appointments', async (req, res) => {
    try {
      const appointments = await dbSelect('SELECT * FROM appointments');
      res.json(appointments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/appointments', async (req, res) => {
    try {
      const apt = {
        ...req.body,
        id: 'ap-' + Date.now(),
        status: 'scheduled'
      };
      const inserted = await dbInsert('appointments', apt);
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Schedule Appointment', `Booked appointment for passenger: ${apt.patientName}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await dbUpdate('appointments', id, req.body);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).send('Not Found');
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/consultations', async (req, res) => {
    try {
      const consultations = await dbSelect('SELECT * FROM consultations');
      res.json(consultations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/consultations', async (req, res) => {
    try {
      const consult = {
        ...req.body,
        id: 'cn-' + Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      const inserted = await dbInsert('consultations', consult);

      const pt = await dbSelectOne('SELECT * FROM patients WHERE id = $1', [consult.patientId]);
      if (pt) {
        await dbUpdate('patients', pt.id, { weight: consult.weight, bmi: consult.bmi });
      }

      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Conduct Consultation', `Saved prescription session feedback for pt-${consult.patientId}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 7. Kitchen Batches CRUD
  app.get('/api/production/batches', async (req, res) => {
    try {
      const batches = await dbSelect('SELECT * FROM kitchen_batches');
      res.json(batches);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/production/batches/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const payload = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      const updated = await dbUpdate('kitchen_batches', id, payload);
      if (updated) {
        await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Cook Stage Transition', `Changed batch status ${id} to ${req.body.status}`);
        res.json(updated);
      } else {
        res.status(404).send('Batch not found');
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 8. Inventory CRUD
  app.get('/api/inventory', async (req, res) => {
    try {
      const inventory = await dbSelect('SELECT * FROM inventory');
      res.json(inventory);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/inventory', async (req, res) => {
    try {
      const ingredient = {
        ...req.body,
        id: 'inv-' + Date.now()
      };
      const inserted = await dbInsert('inventory', ingredient);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/inventory/adjust', async (req, res) => {
    const { itemId, amount, type } = req.body;
    try {
      const match = await dbSelectOne('SELECT * FROM inventory WHERE id = $1', [itemId]);
      if (match) {
        let newStock = match.currentStock;
        if (type === 'add') {
          newStock += amount;
        } else {
          newStock = Math.max(0, newStock - amount);
        }
        const updated = await dbUpdate('inventory', itemId, { currentStock: newStock });
        await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Stock Adjustment', `Adjusted inventory quantity for ${match.name} values changed.`);
        res.json({ success: true, item: updated });
      } else {
        res.status(404).send('Inventory item not found');
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 9. Deliveries & Routes
  app.get('/api/routes', async (req, res) => {
    try {
      const routes = await dbSelect('SELECT * FROM routes');
      res.json(routes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/deliveries', async (req, res) => {
    try {
      const deliveries = await dbSelect('SELECT * FROM deliveries');
      res.json(deliveries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/deliveries', async (req, res) => {
    try {
      const delv = {
        ...req.body,
        id: 'dl-' + Date.now(),
        status: 'assigned'
      };
      const inserted = await dbInsert('deliveries', delv);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/deliveries/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await dbUpdate('deliveries', id, req.body);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).send('Delivery record not found');
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 10. Expenses CRUD
  app.get('/api/expenses', async (req, res) => {
    try {
      const expenses = await dbSelect('SELECT * FROM expenses ORDER BY date DESC');
      res.json(expenses);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    try {
      const expense = {
        ...req.body,
        id: 'ex-' + Date.now()
      };
      const inserted = await dbInsert('expenses', expense);
      await logAudit(req.headers['x-user-id'] as string || 'usr-admin', 'Record Expense', `Added transaction cost of ${expense.amount} under ${expense.category}`);
      res.json(inserted);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 11. Audit Logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const logs = await dbSelect('SELECT * FROM audit_logs ORDER BY timestamp DESC');
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 12. Smart AI Suggestion utilizing Gemini API (from server side only)
  app.post('/api/ai/suggest-plan', async (req, res) => {
    const { patientName, conditions, dietPreferences, weight, bmi, targetGoal } = req.body;

    const ai = getGemini();
    if (!ai) {
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

  // Determine static files directory
  let distPath = '';
  if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
    distPath = path.join(process.cwd(), 'dist');
  } else if (fs.existsSync(path.join(process.cwd(), 'index.html'))) {
    distPath = process.cwd();
  } else {
    distPath = __dirname;
  }

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Selfhosted Nutrition ERP Backend Running on http://localhost:${PORT}`);
  });
}

startServer();
