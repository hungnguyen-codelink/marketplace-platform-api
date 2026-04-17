import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shopsApi } from '../../api/shops';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import type { Shop } from '../../types';

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;

      try {
        const shopData = await shopsApi.getShopById(id);
        setShop(shopData);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <EmptyState title="Shop not found" description="The shop you're looking for does not exist." />
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  const createdDate = new Date(shop.created_at).toLocaleDateString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {shop.banner_url && (
          <img
            src={shop.banner_url}
            alt={shop.name}
            className="h-64 w-full object-cover rounded-t-lg"
          />
        )}

        <div className="p-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{shop.name}</h1>

          {shop.description && (
            <p className="mb-4 text-gray-600">{shop.description}</p>
          )}

          <div className="space-y-3 border-t border-gray-200 pt-4">
            {shop.contact_email && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Contact Email</p>
                <p className="text-gray-900">{shop.contact_email}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-700">Joined</p>
              <p className="text-gray-900">{createdDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
