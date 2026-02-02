import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-6">
      <ol className="flex items-center text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400">/</span>
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="text-blue-600 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-gray-500' : 'text-gray-900'}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
