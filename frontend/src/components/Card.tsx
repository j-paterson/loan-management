interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function CardHeader({ children, actions }: CardHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <div>{children}</div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
}

export function CardFooter({ children }: CardFooterProps) {
  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      {children}
    </div>
  );
}
