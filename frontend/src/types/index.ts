// Shared TypeScript types — mirrors backend schema

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  email_verified: boolean;
  terms_accepted: boolean;
  created_at: string;
}

export interface Shop {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  banner_url?: string;
  contact_email?: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  fakestore_id?: number;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock: number;
  aggregate_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Order {
  id: string;
  buyer_id: string;
  status: OrderStatus;
  shipping_address: ShippingAddress;
  total_amount: number;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface Review {
  id: string;
  order_item_id: string;
  buyer_id: string;
  product_id: string;
  rating: number;
  text?: string;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message: string;
  field?: string;
  errors?: Record<string, string[]>;
}
