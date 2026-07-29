export interface Unit {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Protein {
  id: string;
  name: string;
  category_id: string | null;
  expected_loss: number;
  purchase_price: number;
  color: string;
  active: boolean;
  created_at: string;
  category?: Category | null;
}

export interface Cut {
  id: string;
  protein_id: string;
  name: string;
  gramatura: number;
  active: boolean;
  created_at: string;
}

export interface ProcessingItem {
  id: string;
  processing_id: string;
  cut_name: string;
  quantity: number;
  gramatura: number;
  total_weight: number;
  created_at: string;
}

export interface ProcessingByproduct {
  id: string;
  processing_id: string;
  description: string;
  weight: number;
  created_at: string;
}

export interface Processing {
  id: string;
  responsible: string;
  unit_id: string | null;
  protein_id: string;
  processing_date: string;
  processing_time: string;
  gross_weight: number;
  price_per_kg: number;
  before_photo_url: string | null;
  after_photo_url: string | null;
  produced_weight: number;
  byproduct_weight: number;
  loss_weight: number;
  loss_percentage: number;
  notes: string | null;
  created_at: string;
  protein?: Protein | null;
  unit?: Unit | null;
  items?: ProcessingItem[];
  byproducts?: ProcessingByproduct[];
}

export interface Dish {
  id: string;
  name: string;
  sale_price: number;
  created_at: string;
  items?: DishItem[];
}

export interface DishItem {
  id: string;
  dish_id: string;
  item_type: 'cut' | 'manual';
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  processing_id: string | null;
  cut_name: string | null;
  created_at: string;
}

export interface Settings {
  [key: string]: string;
}

export interface Schedule {
  id: string;
  task_name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  responsible: string;
  active: boolean;
  created_at: string;
}
