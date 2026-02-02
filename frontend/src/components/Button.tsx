import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = 'primary',
  isLoading = false,
  loadingText,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (loadingText ?? 'Loading...') : children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

export function ButtonLink({ to, variant = 'primary', children, className = '' }: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg font-medium transition-colors inline-block ${variantStyles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
