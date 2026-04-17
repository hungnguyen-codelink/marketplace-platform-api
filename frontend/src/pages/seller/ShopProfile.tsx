import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi } from '../../api/shops';
import Button from '../../components/Button';
import Input from '../../components/Input';
import FormField from '../../components/FormField';
import Spinner from '../../components/Spinner';
import { useToast } from '../../contexts/ToastContext';
import type { Shop } from '../../types';

interface FormErrors {
  name?: string;
  contact_email?: string;
}

export default function ShopProfile() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [banner_url, setBannerUrl] = useState('');
  const [contact_email, setContactEmail] = useState('');

  useEffect(() => {
    const loadShop = async () => {
      try {
        const shopData = await shopsApi.getMyShop();
        setShop(shopData);
        setName(shopData.name);
        setDescription(shopData.description || '');
        setBannerUrl(shopData.banner_url || '');
        setContactEmail(shopData.contact_email || '');
      } catch (error: any) {
        if (error.response?.status === 404) {
          navigate('/seller/onboarding');
        }
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [navigate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Shop name is required';
    }

    // Validate contact_email format if provided
    if (contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact_email)) {
        newErrors.contact_email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updated = await shopsApi.updateMyShop({
        name,
        description: description || undefined,
        banner_url: banner_url || undefined,
        contact_email: contact_email || undefined,
      });
      setShop(updated);
      addToast('Shop updated successfully!', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update shop. Please try again.';
      setErrors({ ...errors, contact_email: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Shop Profile</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField
            label="Shop Name"
            htmlFor="name"
            error={errors.name}
            required
          >
            <Input
              id="name"
              type="text"
              placeholder="Enter your shop name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description}
          >
            <Input
              id="description"
              type="text"
              placeholder="Describe your shop"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Banner URL"
            htmlFor="banner_url"
            error={errors.banner_url}
          >
            <Input
              id="banner_url"
              type="text"
              placeholder="https://example.com/banner.jpg"
              value={banner_url}
              onChange={(e) => setBannerUrl(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Contact Email"
            htmlFor="contact_email"
            error={errors.contact_email}
          >
            <Input
              id="contact_email"
              type="email"
              placeholder="shop@example.com"
              value={contact_email}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={saving}
            disabled={saving}
          >
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
