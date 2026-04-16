import { useEffect, useRef, useState, type FormEvent } from "react";
import { ModalDialog } from "@/shared/ui/dialog";
import { InlineMessage, LoadingSpinner } from "@/shared/ui/primitives";

export function EditNameDialog({
  open,
  title,
  description,
  initialValue,
  placeholder,
  cancelLabel,
  submitLabel,
  validationMessage,
  validateInput,
  error,
  isBusy,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  description?: string;
  initialValue: string;
  placeholder: string;
  cancelLabel: string;
  submitLabel: string;
  validationMessage: string;
  validateInput?: (trimmedValue: string) => string | null;
  error?: string | null;
  isBusy: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue(initialValue);
    setValidationError(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [initialValue, open]);

  function getInputValidationError(nextValue: string) {
    const trimmed = nextValue.trim();
    if (!trimmed) {
      return null;
    }

    return validateInput?.(trimmed) ?? null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError(validationMessage);
      inputRef.current?.focus();
      return;
    }

    const customValidationError = validateInput?.(trimmed) ?? null;
    if (customValidationError) {
      setValidationError(customValidationError);
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  }

  const isSubmitDisabled = isBusy || Boolean(getInputValidationError(value));

  return (
    <ModalDialog
      open={open}
      title={title}
      description={description}
      onClose={() => {
        setValue(initialValue);
        setValidationError(null);
        onClose();
      }}
      actions={(
        <>
          <button
            className="button-secondary w-full sm:w-auto"
            onClick={() => {
              setValue(initialValue);
              setValidationError(null);
              onClose();
            }}
            type="button"
          >
            {cancelLabel}
          </button>
          <button className="button-primary w-full sm:w-auto" disabled={isSubmitDisabled} form="edit-name-form" type="submit">
            {isBusy ? <LoadingSpinner /> : null}
            {submitLabel}
          </button>
        </>
      )}
    >
      <form
        id="edit-name-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <label className="space-y-2">
          {/* <span className="text-sm font-semibold text-ink">{title}</span> */}
          <input
            ref={inputRef}
            className={[
              "input-base",
              validationError ? "border-danger focus:border-danger focus:ring-danger/10" : ""
            ].join(" ")}
            placeholder={placeholder}
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              setValue(nextValue);
              setValidationError(getInputValidationError(nextValue));
            }}
          />
        </label>
        {validationError ? <InlineMessage tone="error">{validationError}</InlineMessage> : null}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      </form>
    </ModalDialog>
  );
}
