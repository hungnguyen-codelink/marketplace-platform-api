import React, { useState } from 'react';
import StarRating from './StarRating';
import Button from './Button';

interface ReviewFormProps {
  orderItemId: string;
  onSubmit: (data: { order_item_id: string; rating: number; text?: string }) => Promise<void> | void;
  isLoading?: boolean;
}

export default function ReviewForm({ orderItemId, onSubmit, isLoading = false }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      order_item_id: orderItemId,
      rating,
      text: text || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating
        </label>
        <StarRating
          rating={rating}
          interactive={true}
          onChange={setRating}
        />
      </div>

      <div>
        <label htmlFor={`review-text-${orderItemId}`} className="block text-sm font-medium text-gray-700 mb-2">
          Comment (optional)
        </label>
        <textarea
          id={`review-text-${orderItemId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a comment..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={rating === 0 || isLoading}
      >
        {isLoading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
