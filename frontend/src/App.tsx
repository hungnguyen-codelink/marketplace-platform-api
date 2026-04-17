import React from 'react';
import { Routes, Route } from 'react-router-dom';

import RequireAuth from './components/guards/RequireAuth';
import RequireRole from './components/guards/RequireRole';
import ToastContainer from './components/Toast';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Buyer pages
import ProductBrowse from './pages/buyer/ProductBrowse';
import ProductDetail from './pages/buyer/ProductDetail';
import ShopDetail from './pages/buyer/ShopDetail';
import Cart from './pages/buyer/Cart';
import Checkout from './pages/buyer/Checkout';
import CheckoutSuccess from './pages/buyer/CheckoutSuccess';
import OrderHistory from './pages/buyer/OrderHistory';
import OrderDetail from './pages/buyer/OrderDetail';

// Seller pages
import SellerOnboarding from './pages/seller/SellerOnboarding';
import ShopProfile from './pages/seller/ShopProfile';
import ProductManagement from './pages/seller/ProductManagement';
import CreateProduct from './pages/seller/CreateProduct';
import FakeStoreImport from './pages/seller/FakeStoreImport';
import EditProduct from './pages/seller/EditProduct';
import SellerOrders from './pages/seller/SellerOrders';
import SellerOrderDetail from './pages/seller/SellerOrderDetail';

// Admin pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminShops from './pages/admin/AdminShops';
import AdminOrders from './pages/admin/AdminOrders';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<ProductBrowse />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/shops/:id" element={<ShopDetail />} />

        {/* Buyer routes (authenticated) */}
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/checkout/success" element={<RequireAuth><CheckoutSuccess /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />

        {/* Seller routes */}
        <Route path="/seller/onboarding" element={<RequireAuth><SellerOnboarding /></RequireAuth>} />
        <Route path="/seller/shop" element={<RequireAuth><RequireRole role="seller"><ShopProfile /></RequireRole></RequireAuth>} />
        <Route path="/seller/products" element={<RequireAuth><RequireRole role="seller"><ProductManagement /></RequireRole></RequireAuth>} />
        <Route path="/seller/products/new" element={<RequireAuth><RequireRole role="seller"><CreateProduct /></RequireRole></RequireAuth>} />
        <Route path="/seller/products/import" element={<RequireAuth><RequireRole role="seller"><FakeStoreImport /></RequireRole></RequireAuth>} />
        <Route path="/seller/products/:id/edit" element={<RequireAuth><RequireRole role="seller"><EditProduct /></RequireRole></RequireAuth>} />
        <Route path="/seller/orders" element={<RequireAuth><RequireRole role="seller"><SellerOrders /></RequireRole></RequireAuth>} />
        <Route path="/seller/orders/:id" element={<RequireAuth><RequireRole role="seller"><SellerOrderDetail /></RequireRole></RequireAuth>} />

        {/* Admin routes */}
        <Route path="/admin/users" element={<RequireAuth><RequireRole role="admin"><AdminUsers /></RequireRole></RequireAuth>} />
        <Route path="/admin/shops" element={<RequireAuth><RequireRole role="admin"><AdminShops /></RequireRole></RequireAuth>} />
        <Route path="/admin/orders" element={<RequireAuth><RequireRole role="admin"><AdminOrders /></RequireRole></RequireAuth>} />
      </Routes>

      <ToastContainer />
    </>
  );
}
