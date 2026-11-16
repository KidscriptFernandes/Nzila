import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Input, type InputProps } from "./Input";

type FormInputProps<T extends FieldValues> = Omit<
  InputProps,
  "value" | "onChangeText" | "onBlur"
> & {
  control: Control<T>;
  name: Path<T>;
};

export function FormInput<T extends FieldValues>({
  control,
  name,
  error,
  ...props
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...props}
          ref={field.ref}
          value={field.value == null ? "" : String(field.value)}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={error ?? fieldState.error?.message}
        />
      )}
    />
  );
}
