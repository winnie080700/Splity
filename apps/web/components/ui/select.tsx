type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  className?: string;
  defaultValue?: string;
  label: string;
  name: string;
  options: SelectOption[];
};

export function Select({
  className,
  defaultValue,
  label,
  name,
  options,
}: SelectProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      <select
        className={[
          "h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
