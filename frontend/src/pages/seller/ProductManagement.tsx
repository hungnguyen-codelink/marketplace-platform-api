import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/products';
import type { Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

export default function ProductManagement() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; productId?: string }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getMyProducts();
      setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (productId: string) => {
    setDeleteModal({ open: true, productId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.productId) return;

    try {
      setDeleting(true);
      await productsApi.deleteProduct(deleteModal.productId);
      addToast('Product deleted successfully', 'success');
      setDeleteModal({ open: false });
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      addToast('Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <Link
          to="/seller/products/new"
          className="inline-block"
        >
          <Button variant="primary">Create Product</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to get started"
          action={
            <Link
              to="/seller/products/new"
              className="inline-block mt-4"
            >
              <Button variant="primary">Create Product</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Stock
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{product.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.stock}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/seller/products/${product.id}/edit`}
                      className="inline-block mr-3"
                    >
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteClick(product.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Delete Product"
        onClose={() => setDeleteModal({ open: false })}
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      >
        Are you sure you want to delete this product? This action cannot be undone.
      </Modal>
    </div>
  );
}
