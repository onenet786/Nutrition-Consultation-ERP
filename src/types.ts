/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'nutritionist' | 'kitchen' | 'dispatcher' | 'rider' | 'patient';
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  cnic: string;
  photoUrl?: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  emergencyContact: string;
  height: number; // in cm
  weight: number; // in kg
  bmi: number;
  bloodGroup: string;
  allergies: string[];
  medicalConditions: string[];
  lifestyle: {
    activityLevel: string;
    sleepHours: number;
    waterIntake: number;
    foodPreferences: string;
    foodRestrictions: string;
  };
  status: 'prospect' | 'active' | 'inactive' | 'suspended' | 'completed';
  joinedDate: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  type: 'Initial Consultation' | 'Follow-Up' | 'Assessment Review';
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no-show';
  dateTime: string;
  videoLink?: string;
  voiceLink?: string;
  notes?: string;
}

export interface ConsultationNote {
  id: string;
  patientId: string;
  date: string;
  weight: number;
  bmi: number;
  systolic?: number;
  diastolic?: number;
  notes: string;
  recommendations: string;
  assignedProgram?: string;
}

export interface Program {
  id: string;
  patientId: string;
  name: string;
  type: 'Weight Loss' | 'Weight Gain' | 'Diabetic' | 'Keto' | 'Low Carb' | 'High Protein' | 'General Wellness' | 'Custom';
  startDate: string;
  endDate: string;
  durationWeeks: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  nutritionistId: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number; // minutes
  cookTime: number; // minutes
  servingSize: number;
  ingredients: RecipeIngredient[];
  nutritionalValues: {
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fat: number; // grams
    fiber?: number;
    sodium?: number;
  };
  instructions: string[];
}

export interface MealPlanDay {
  date: string;
  meals: {
    breakfast?: string; // Recipe ID
    midMorningSnack?: string; // Recipe ID
    lunch?: string; // Recipe ID
    eveningSnack?: string; // Recipe ID
    dinner?: string; // Recipe ID
  };
}

export interface MealPlan {
  id: string;
  patientId: string;
  startDate: string;
  endDate: string;
  days: MealPlanDay[];
  status: 'draft' | 'active' | 'inactive';
}

export interface KitchenBatch {
  id: string;
  date: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  mealType: 'breakfast' | 'midMorningSnack' | 'lunch' | 'eveningSnack' | 'dinner';
  assignedTo?: string; // Staff name
  status: 'pending' | 'assigned' | 'cooking' | 'completed' | 'packed' | 'ready';
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Meat & Poultry' | 'Dairy Products' | 'Dry Goods' | 'Spices' | 'Packaging Materials' | 'Supplements';
  currentStock: number;
  minThreshold: number;
  unit: string;
  batchAndExpiry?: {
    batchNo: string;
    manufacturingDate: string;
    expiryDate: string;
    supplier: string;
  }[];
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  items: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
  date: string;
  deliveryDate?: string;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  timingSlot: 'morning' | 'afternoon' | 'evening';
  riderId?: string;
  riderName?: string;
  patientIds: string[];
}

export interface Delivery {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  patientPhone: string;
  routeId: string;
  routeName: string;
  riderId: string;
  riderName: string;
  mealType: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  proofOfDelivery?: {
    method: 'otp' | 'signature' | 'photo' | 'gps';
    otpCode?: string;
    verifiedOtp?: boolean;
    signatureData?: string; // base64
    photoUrl?: string; // base64 / generated placeholder
    latitude?: number;
    longitude?: number;
    timestamp: string;
  };
  exceptionNotes?: string;
  scheduledSlot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
}

export interface OperatingExpense {
  id: string;
  category: 'Ingredients' | 'Packaging' | 'Gas & Power' | 'Fuel' | 'Rider Wages' | 'Staff Salaries' | 'Rent' | 'Software & Utilities' | 'Marketing';
  amount: number;
  date: string;
  paymentMethod: string;
  vendor: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string; // e.g. "Create Patient", "Update Meal Plan"
  details: string;
}

export interface DbState {
  patients: Patient[];
  appointments: Appointment[];
  consultations: ConsultationNote[];
  programs: Program[];
  recipes: Recipe[];
  mealPlans: MealPlan[];
  kitchenBatches: KitchenBatch[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  routes: DeliveryRoute[];
  deliveries: Delivery[];
  expenses: OperatingExpense[];
  auditLogs: AuditLog[];
}
