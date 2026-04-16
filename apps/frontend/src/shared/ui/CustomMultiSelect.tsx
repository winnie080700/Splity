import { forwardRef, type ReactNode } from "react";
import Select, { components, type GroupBase, type MultiValue, type SelectInstance } from "react-select";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type CustomMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  meta?: string;
  icon?: ReactNode;
};

export type CustomMultiSelectRef = SelectInstance<CustomMultiSelectOption, true, GroupBase<CustomMultiSelectOption>>;

export const CustomMultiSelect = forwardRef<CustomMultiSelectRef, {
  ariaLabel: string;
  value: string[];
  options: CustomMultiSelectOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
  className?: string;
}>(
  function CustomMultiSelect(
    {
      ariaLabel,
      value,
      options,
      onChange,
      placeholder,
      disabled = false,
      invalid = false,
      compact = false,
      className
    },
    forwardedRef
  ) {
    const selectedOptions = options.filter((option) => value.includes(option.value));

    return (
      <Select<CustomMultiSelectOption, true>
        ref={forwardedRef}
        unstyled
        aria-label={ariaLabel}
        className={className}
        classNames={{
          control: (state) => cn(
            "flex w-full items-start rounded-[12px] border bg-white px-2.5 transition",
            compact ? "min-h-9 py-0.5" : "min-h-10 py-1",
            invalid
              ? "border-danger focus-within:border-danger focus-within:ring-4 focus-within:ring-danger/10"
              : "border-slate-200 hover:border-slate-300 focus-within:border-brand/40 focus-within:ring-4 focus-within:ring-brand/10",
            state.isDisabled && "cursor-not-allowed opacity-60"
          ),
          valueContainer: () => cn("gap-1 py-0.5", compact && "px-0"),
          placeholder: () => "text-sm text-muted",
          input: () => "m-0 p-0 text-sm",
          indicatorsContainer: () => "text-muted",
          dropdownIndicator: (state) => cn("px-0 pt-0.5", state.isFocused && "text-brand"),
          multiValue: () => "tag rounded-full border border-sky-200 bg-sky/70 px-1.5 py-0.5 text-brand",
          multiValueLabel: () => "px-0 text-[11px] font-semibold",
          multiValueRemove: () => "ml-0.5 rounded-full px-1 text-brand hover:bg-brand/10",
          menu: () => "dropdown-surface z-[80] mt-1 max-h-72 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-soft",
          menuList: () => "max-h-72 space-y-1 overflow-y-auto p-1.5",
          option: (state) => cn(
            "cursor-pointer rounded-[10px] px-2.5 py-1.5 text-sm transition",
            state.isSelected
              ? "bg-brand text-white"
              : state.isFocused
                ? "bg-slate-100 text-ink"
                : "text-muted"
          )
        }}
        closeMenuOnSelect={false}
        components={{
          IndicatorSeparator: null,
          Option: (props) => {
            const { data, isSelected } = props;
            return (
              <components.Option {...props}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{data.label}</div>
                    {data.description ? <div className="mt-0.5 text-xs opacity-80">{data.description}</div> : null}
                  </div>
                  {isSelected ? <span className="text-xs font-semibold uppercase tracking-[0.12em]">✓</span> : null}
                </div>
              </components.Option>
            );
          }
        }}
        hideSelectedOptions={false}
        isDisabled={disabled}
        isMulti
        isSearchable={false}
        menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
        onChange={(next) => onChange((next as MultiValue<CustomMultiSelectOption>).map((option) => option.value))}
        options={options}
        placeholder={placeholder ?? ariaLabel}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 90 }) }}
        value={selectedOptions}
      />
    );
  }
);
