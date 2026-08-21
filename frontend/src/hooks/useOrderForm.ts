import { useState } from "react";
import { createOrder } from "../api/orders";
import { ApiError } from "../errors/ApiError";
import type { OrderTitle } from "../types/api";

/**
 * All the logic behind the order form, kept out of the component.
 *
 * The page below renders inputs and wires them up; every rule about what
 * is required, when, and what happens on submit lives here. That split
 * is what requirement 5.2 means by "separating logic from UI with custom
 * hooks", and it means the rules can be read without wading through JSX.
 */

/** Whether the coffee is wanted now or after a delay. */
export type CoffeeTime = "now" | "later";

/** Which fields the user can get wrong. */
type FieldName = "name" | "password" | "minutes";

/**
 * Validation messages keyed by field. Partial, because most of the time
 * most fields are fine - an absent key means that field is valid.
 */
export type FieldErrors = Partial<Record<FieldName, string>>;

const SERVER_FIELD_TO_FORM: Record<string, FieldName> = {
  name: "name",
  password: "password",
  delayMinutes: "minutes",
};

export type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function useOrderForm() {
  // One piece of state per input. `minutes` is a STRING even though it
  // is a number field: an <input> always gives back a string, and
  // storing it raw means a half-typed or empty value stays exactly what
  // the user typed instead of becoming NaN. It is converted once, at
  // submit time.
  const [name, setName] = useState("");
  const [title, setTitle] = useState<OrderTitle>("employee");
  const [password, setPassword] = useState("");
  const [when, setWhen] = useState<CoffeeTime>("now");
  const [minutes, setMinutes] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState("");

  /**
   * Client-side validation (requirement 4.2.2 - "basic validation before
   * sending"). Returns every problem at once rather than stopping at the
   * first, so the user fixes the form in one pass.
   *
   * The two conditional rules mirror the form itself: a password only
   * matters for a boss, minutes only matter for a delayed order.
   */
  function validate(): FieldErrors {
    const found: FieldErrors = {};

    if (name.trim() === "") {
      found.name = "Name is required";
    }

    if (title === "boss" && password === "") {
      found.password = "Boss password is required";
    }

    if (when === "later") {
      const parsed = Number(minutes);

      if (minutes.trim() === "") {
        found.minutes = "Minutes are required";
      } else if (!Number.isInteger(parsed)) {
        found.minutes = "Minutes must be a whole number";
      } else if (parsed < 1) {
        found.minutes = "Minutes must be at least 1";
      } else if (parsed > 1440) {
        found.minutes = "Minutes cannot exceed 24 hours";
      }
    }

    return found;
  }

  /** Clears the inputs, leaving the success message on screen. */
  function resetFields(): void {
    setName("");
    setTitle("employee");
    setPassword("");
    setWhen("now");
    setMinutes("");
    setErrors({});
  }

  /**
   * Translates the backend's field names onto this form's field names.
   *
   * The server validates independently and may reject something the
   * client allowed. Its `delayMinutes` is this form's `minutes` input,
   * so the message has to be re-pointed to land under the right field.
   */
  function mapServerErrors(apiFieldErrors: ApiError["fieldErrors"]): FieldErrors {
    const mapped: FieldErrors = {};

    for (const { field, message } of apiFieldErrors) {
      const formField = SERVER_FIELD_TO_FORM[field];
      
      if (formField) {
        mapped[formField] = message;
      }
    }

    return mapped;
  }

  async function submit(): Promise<void> {
    const found = validate();
    setErrors(found);

    // Object.keys on an empty object is [], so this is "any errors?".
    if (Object.keys(found).length > 0) {
      setStatus("error");
      setMessage("Please fix the highlighted fields.");
      
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const order = await createOrder({
        name: name.trim(),
        title,
        // Only sent for a boss order; the field does not exist otherwise.
        ...(title === "boss" ? { password } : {}),
        delayMinutes: when === "later" ? Number(minutes) : 0,
      });

      setStatus("success");
      setMessage(
        order.delayMinutes > 0
          ? `Order #${String(order.id)} placed for ${order.name}. Brewing starts in ${String(order.delayMinutes)} minutes.`
          : `Order #${String(order.id)} placed for ${order.name}. It is being prepared now.`,
      );

      resetFields();
    } catch (error) {
      setStatus("error");

      if (error instanceof ApiError) {
        setMessage(error.message);

        // A 400 carries per-field details, so they map straight across.
        const mapped = mapServerErrors(error.fieldErrors);

        // A 401 carries only a message - there is no `errors` array to
        // map. But the sole thing that can be unauthorised on this form
        // is the boss password, so the message is pointed at that field
        // as well as the banner. Otherwise the input the user has to fix
        // is the one place saying nothing.
        if (error.status === 401) {
          mapped.password = error.message;
        }

        setErrors(mapped);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    }
  }

  return {
    name,
    setName,
    title,
    setTitle,
    password,
    setPassword,
    when,
    setWhen,
    minutes,
    setMinutes,
    errors,
    status,
    message,
    submit,
  };
}
