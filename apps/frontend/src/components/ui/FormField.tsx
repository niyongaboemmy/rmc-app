import { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5 select-none">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="text-base font-semibold text-gray-900 mb-0.5">{title}</legend>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      <div className="space-y-4 mt-3">{children}</div>
    </fieldset>
  );
}
