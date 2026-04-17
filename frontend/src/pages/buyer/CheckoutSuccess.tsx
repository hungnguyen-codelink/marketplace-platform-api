import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/Button';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = (location.state as { orderId?: string })?.orderId || 'Unknown';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-600 mb-6">Thank you for your purchase.</p>

        <div className="bg-gray-50 rounded p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">Order ID</p>
          <p className="text-lg font-mono font-semibold text-gray-900">{orderId}</p>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          You will receive an email confirmation shortly. Track your order status below.
        </p>

        <Button
          onClick={() => navigate('/orders')}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          View Orders
        </Button>
      </div>
    </div>
  );
}
