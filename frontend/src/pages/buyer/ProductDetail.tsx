import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productsApi } from '../../api/products';
import type { Product } from '../../types';
import Spinner from '../../components/Spinner';
import Badge from '../../components/Badge';
import StarRating from '../../components/StarRating';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      if (!id) throw new Error('Product ID is missing');
      const data = await productsApi.getProductById(id);
      setProduct(data);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error('Failed to fetch product:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-900">
            Product not found
          </h2>
          <p className="text-red-700">
            The product you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Product Image */}
        {product.image_url && (
          <div className="flex items-center justify-center rounded-lg bg-gray-100">
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover rounded-lg max-h-96"
            />
          </div>
        )}

        {/* Product Info */}
        <div className="flex flex-col">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            {product.title}
          </h1>

          <p className="mb-6 text-gray-600">
            {product.description || 'No description provided'}
          </p>

          {/* Price */}
          <p className="mb-6 text-4xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </p>

          {/* Rating */}
          <div className="mb-6 flex items-center gap-2">
            <StarRating rating={product.aggregate_rating} interactive={false} />
            <span className="text-sm text-gray-600">
              ({product.review_count} reviews)
            </span>
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock === 0 ? (
              <Badge color="red">Out of Stock</Badge>
            ) : (
              <Badge color="green">In Stock</Badge>
            )}
          </div>

          {/* Additional Info */}
          <div className="border-t border-gray-200 pt-6">
            {product.category && (
              <p className="mb-2 text-sm text-gray-600">
                <span className="font-semibold">Category:</span> {product.category}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Stock available:</span> {product.stock}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
