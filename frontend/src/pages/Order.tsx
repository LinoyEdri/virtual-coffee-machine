import Field from "../components/Field";
import Message from "../components/Message";
import RadioGroup from "../components/RadioGroup";
import { useOrderForm } from "../hooks/useOrderForm";

/**
 * The order form (requirement 4.2.2).
 *
 * This component only renders and wires up. Every rule about what is
 * required, when, and what happens on submit lives in useOrderForm.
 */
function Order() {
  const {
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
  } = useOrderForm();

  return (
    <div>
      <h1>Order Coffee</h1>

      <form
        onSubmit={(e) => {
          // Without this the browser performs its own form submission
          // and reloads the page, losing everything.
          e.preventDefault();
          // `void`: the hook handles its own errors, so there is nothing
          // to await. It marks the floating promise as deliberate.
          void submit();
        }}
      >
        <Field
          id="name"
          label="Name"
          value={name}
          onChange={setName}
          error={errors.name}
        />

        <RadioGroup
          id="title"
          label="Title"
          value={title}
          onChange={setTitle}
          options={[
            { value: "employee", label: "Employee" },
            { value: "boss", label: "Boss" },
          ]}
        />

        {/* 4.2.2 - the password field exists only for a boss order. */}
        {title === "boss" ? (
          <Field
            id="password"
            label="Boss password"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
        ) : null}

        <RadioGroup
          id="when"
          label="When"
          value={when}
          onChange={setWhen}
          options={[
            { value: "now", label: "Now" },
            { value: "later", label: "Later" },
          ]}
        />

        {/* 4.2.2 - the minutes field exists only for a delayed order. */}
        {when === "later" ? (
          <Field
            id="minutes"
            label="Minutes from now"
            type="number"
            min={1}
            value={minutes}
            onChange={setMinutes}
            error={errors.minutes}
          />
        ) : null}

        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Placing order..." : "Order coffee"}
        </button>
      </form>

      {/* Renders null when `message` is empty, so no condition needed. */}
      <Message type={status === "success" ? "success" : "error"}>
        {message}
      </Message>
    </div>
  );
}

export default Order;
