import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products';
import type { Product, PaginatedResponse } from '../../types';
import Spinner from '../../components/Spinner';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';

const CATEGORIES = ['All Categories', 'electronics', 'clothing', 'books', 'home', 'sports', 'toys'];

export default function ProductBrowse() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchProducts();
  }, [search, category, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        search: search || undefined,
        category: category || undefined,
        page,
        limit,
      };
      const data = await productsApi.getProducts(params);
      setProducts(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === 'All Categories' ? '' : value);
    setPage(1);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Browse Products</h1>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={category || 'All Categories'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
              >
                {product.image_url && (
                  <div className="h-48 overflow-hidden bg-gray-100">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                  <button
                    onClick={() => handleProductClick(product.id)}
                    className="mb-2 text-left font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    <a href={`/products/${product.id}`}>{product.title}</a>
                  </button>

                  <p className="mb-2 text-lg font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                  </p>

                  <div className="mb-3 flex items-center justify-between">
                    {product.stock === 0 ? (
                      <Badge color="red">Out of Stock</Badge>
                    ) : (
                      <Badge color="green">In Stock</Badge>
                    )}
                  </div>

                  {product.review_count > 0 && (
                    <p className="text-xs text-gray-500">
                      ({product.review_count} reviews)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                Previous
              </Button>
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="secondary"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
