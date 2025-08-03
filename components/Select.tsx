
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
  value?: string | undefined; // Allow value to be undefined
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', containerClassName = '', ...props }) => {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        value={props.value ?? ""} // Use empty string if value is undefined, for placeholder
        className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      >
        <option value="" disabled className="text-slate-500">Select {label?.toLowerCase()}...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-100 bg-slate-700">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
