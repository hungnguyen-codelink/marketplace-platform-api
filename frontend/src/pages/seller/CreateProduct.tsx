import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import FormField from '../../components/FormField';

interface FormErrors {
  [key: string]: string;
}

export default function CreateProduct() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    image_url: '',
    category: '',
    stock: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        newErrors.price = 'Price must be greater than 0';
      } else if (!/^\d+(\.\d{1,2})?$/.test(formData.price)) {
        newErrors.price = 'Max 2 decimal places';
      }
    }

    if (!formData.stock) {
      newErrors.stock = 'Stock is required';
    } else {
      const stock = parseInt(formData.stock, 10);
      if (isNaN(stock) || formData.stock.includes('.')) {
        newErrors.stock = 'Stock must be a whole number';
      } else if (stock < 0 || stock > 999999) {
        newErrors.stock = 'Stock must be between 0 and 999999';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await productsApi.createProduct({
        title: formData.title,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        image_url: formData.image_url || undefined,
        category: formData.category || undefined,
        stock: parseInt(formData.stock, 10),
      });
      addToast('Product created successfully', 'success');
      navigate('/seller/products');
    } catch (error) {
      console.error('Failed to create product:', error);
      addToast('Failed to create product', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Create Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 p-6">
        <FormField label="Title" htmlFor="title" required error={errors.title}>
          <Input
            name="title"
            id="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter product title"
          />
        </FormField>

        <FormField label="Description" htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            rows={4}
          />
        </FormField>

        <FormField label="Price" htmlFor="price" required error={errors.price}>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter product price"
          />
        </FormField>

        <FormField label="Image URL" htmlFor="image_url" error={errors.image_url}>
          <Input
            id="image_url"
            name="image_url"
            type="url"
            value={formData.image_url}
            onChange={handleChange}
            placeholder="Enter image URL (optional)"
          />
        </FormField>

        <FormField label="Category" htmlFor="category" error={errors.category}>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a category (optional)</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="books">Books</option>
            <option value="home">Home</option>
            <option value="sports">Sports</option>
            <option value="toys">Toys</option>
          </select>
        </FormField>

        <FormField label="Stock" htmlFor="stock" required error={errors.stock}>
          <Input
            id="stock"
            name="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={handleChange}
            placeholder="Enter stock quantity"
          />
        </FormField>

        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading}
          >
            Create
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/seller/products')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
