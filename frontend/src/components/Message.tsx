import type { ReactNode } from "react";

interface MessageProps {
  type: "success" | "error";
  children: ReactNode;
}

/**
 * The success / error banner required by 4.2.2.
 *
 * Returns null when there is nothing to say, so a page can render it
 * unconditionally instead of wrapping it in its own condition.
 *
 * Until the design stage there is no colour, so the two kinds are
 * distinguished by a text prefix. `role="alert"` makes assistive
 * technology announce the message when it appears - which matters here,
 * because the text shows up far from where the user was typing.
 */
function Message({ type, children }: MessageProps) {
  if (!children) {
    return null;
  }

  return (
    <p role="alert">
      <strong>{type === "success" ? "Success:" : "Error:"}</strong> {children}
    </p>
  );
}

export default Message;
