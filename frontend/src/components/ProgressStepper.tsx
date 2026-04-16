import React from 'react';
import type { OrderStatus } from '../types';

interface ProgressStepperProps {
  currentStatus: OrderStatus;
}

const steps: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

const statusOrder: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  completed: 4,
};

export default function ProgressStepper({ currentStatus }: ProgressStepperProps) {
  const currentIndex = statusOrder[currentStatus];

  return (
    <ol className="flex w-full items-center">
      {steps.map((step, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <li key={step.status} className={`flex flex-1 items-center ${idx < steps.length - 1 ? 'after:w-full after:border-t-2 after:content-[""]' : ''} ${done || active ? 'after:border-indigo-500' : 'after:border-gray-200'}`}>
            <span className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                    ? 'border-2 border-indigo-600 bg-white text-indigo-600'
                    : 'border-2 border-gray-200 bg-white text-gray-400'
                }`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span className={`mt-1 text-xs ${active ? 'font-semibold text-indigo-600' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
