"use client";

import * as React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { fr } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateInput } from "@/lib/utils/date";

registerLocale("fr", fr);

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
  error = false,
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  });

  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      } else {
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (onChange) {
      // Si la date est valide, on la formate, sinon on envoie une chaîne vide
      if (date && !isNaN(date.getTime())) {
        onChange(formatDateInput(date));
      } else {
        onChange("");
      }
    }
  };

  return (
    <div className="relative group">
      <DatePicker
        id={id}
        selected={selectedDate}
        onChange={handleDateChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        locale="fr"
        showYearDropdown
        showMonthDropdown
        scrollableYearDropdown
        yearDropdownItemNumber={100}
        dropdownMode="select"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          error
            ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-600"
            : "focus-visible:ring-blue-500 focus-visible:border-blue-500 hover:border-gray-400",
          className
        )}
        calendarClassName="!font-sans shadow-xl"
        wrapperClassName="w-full"
        showPopperArrow={false}
        popperClassName="!z-50 !mt-2"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Calendar className={cn(
          "h-4 w-4 transition-colors duration-200",
          error ? "text-red-500" : "text-gray-400 group-hover:text-blue-500"
        )} />
      </div>
    </div>
  );
}
