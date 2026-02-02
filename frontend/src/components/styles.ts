// Shared input style helper for consistent styling
export const inputStyles = (hasError: boolean) =>
  `block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
    hasError ? 'border-red-500' : 'border-gray-300'
  } focus:ring-blue-500 focus:border-blue-500`;
