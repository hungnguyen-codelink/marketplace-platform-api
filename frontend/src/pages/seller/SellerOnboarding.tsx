import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi } from '../../api/shops';
import Button from '../../components/Button';
import Input from '../../components/Input';
import FormField from '../../components/FormField';
import { useToast } from '../../contexts/ToastContext';

interface FormErrors {
  name?: string;
  contact_email?: string;
  submit?: string;
}

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [banner_url, setBannerUrl] = useState('');
  const [contact_email, setContactEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

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

  const handleContinueStep1 = () => {
    if (termsAccepted) {
      setStep(2);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await shopsApi.createShop({
        name,
        description: description || undefined,
        banner_url: banner_url || undefined,
        contact_email: contact_email || undefined,
      });

      addToast('Shop created successfully!', 'success');
      navigate('/seller/shop');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create shop. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Seller Onboarding</h1>

      {step === 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Accept Terms</h2>
          <div className="mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span className="text-gray-700">
                I accept the terms and conditions for opening a shop
              </span>
            </label>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!termsAccepted}
            onClick={handleContinueStep1}
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Create Your Shop</h2>

          <form className="space-y-6" onSubmit={handleSubmitStep2}>
            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </FormField>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handleBackToStep1}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                loading={loading}
                disabled={loading}
              >
                Create Shop
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
