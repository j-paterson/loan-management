interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Input style helper for consistent styling
export const inputStyles = (hasError: boolean) =>
  `block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
    hasError ? 'border-red-500' : 'border-gray-300'
  } focus:ring-blue-500 focus:border-blue-500`;
