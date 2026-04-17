import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fakestoreApi } from '../../api/fakestore';
import type { FakestoreProduct } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

export default function FakeStoreImport() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [products, setProducts] = useState<FakestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importModal, setImportModal] = useState<{
    open: boolean;
    overwrite: boolean;
  }>({
    open: false,
    overwrite: false,
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fakestoreApi.getProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to load FakeStore products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (fakestoreId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(fakestoreId)) {
      newSelected.delete(fakestoreId);
    } else {
      newSelected.add(fakestoreId);
    }
    setSelected(newSelected);
  };

  const handleImportClick = () => {
    setImportModal({ ...importModal, open: true });
  };

  const handleImportConfirm = async () => {
    try {
      setImporting(true);
      const ids = Array.from(selected);
      await fakestoreApi.importProducts(ids, importModal.overwrite);

      addToast(`Successfully imported ${selected.size} product(s)`, 'success');
      setSelected(new Set());
      setImportModal({ open: false, overwrite: false });
      navigate('/seller/products');
    } catch (err) {
      setError('Failed to import products. Please try again.');
      setImportModal({ open: false, overwrite: false });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Import from FakeStore</h1>
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Import from FakeStore</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchProducts}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {products.length === 0 && !error ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No products available from FakeStore</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.fakestore_id}
                className="overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-200">
                      <span className="text-sm text-gray-400">No image</span>
                    </div>
                  )}
                  <label className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-white shadow">
                    <input
                      type="checkbox"
                      checked={selected.has(product.fakestore_id)}
                      onChange={() => handleSelectProduct(product.fakestore_id)}
                      className="h-4 w-4 cursor-pointer accent-indigo-600"
                    />
                  </label>
                </div>
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900">
                    {product.title}
                  </h3>
                  <p className="mb-3 text-xs text-gray-500">{product.category}</p>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.aggregate_rating > 0 && (
                      <span className="text-sm text-gray-600">
                        ⭐ {product.aggregate_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-4 flex justify-end">
            <Button
              variant="primary"
              onClick={handleImportClick}
              disabled={selected.size === 0}
            >
              Import ({selected.size})
            </Button>
          </div>
        </>
      )}

      <Modal
        open={importModal.open}
        title="Confirm Import"
        onClose={() => {
          if (!importing) setImportModal({ ...importModal, open: false });
        }}
        onConfirm={handleImportConfirm}
        confirmLabel="Import"
        confirmVariant="primary"
        loading={importing}
      >
        <div className="space-y-4">
          <p>
            You are about to import <strong>{selected.size}</strong> product
            {selected.size !== 1 ? 's' : ''}.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={importModal.overwrite}
              onChange={(e) =>
                setImportModal({ ...importModal, overwrite: e.target.checked })
              }
              disabled={importing}
              className="h-4 w-4 cursor-pointer accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              Overwrite existing products (if any)
            </span>
          </label>
          <p className="text-xs text-gray-500">
            {importModal.overwrite
              ? 'All fields will be updated for existing products.'
              : 'Existing products will keep their price, description, and stock. Other fields will be updated.'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
