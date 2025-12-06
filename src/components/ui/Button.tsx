import { cva, type VariantProps } from 'class-variance-authority';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility or I'll provide it below

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
        outline: 'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
        gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-lg',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'w-full py-4 text-lg', // Good for mobile actions
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))} // Use cn for merging
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
