"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useRef } from "react";

type AutoSubmitOnChangeProps = {
  children: ReactNode;
};

const TEXT_INPUT_DELAY = 450;

export function AutoSubmitOnChange({ children }: AutoSubmitOnChangeProps) {
  const submitTimer = useRef<number | null>(null);
  const isComposing = useRef(false);

  function handleChange(event: ChangeEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      submitSoon(target.form, 0);
      return;
    }

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      submitSoon(target.form, 0);
    }
  }

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "checkbox") return;
    if (isComposing.current) return;
    submitSoon(target.form, TEXT_INPUT_DELAY);
  }

  function handleCompositionStart() {
    isComposing.current = true;
    if (submitTimer.current !== null) {
      window.clearTimeout(submitTimer.current);
      submitTimer.current = null;
    }
  }

  function handleCompositionEnd(event: FormEvent<HTMLDivElement>) {
    isComposing.current = false;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "checkbox") return;
    submitSoon(target.form, TEXT_INPUT_DELAY);
  }

  function submitSoon(form: HTMLFormElement | null, delay: number) {
    if (!form) return;
    if (submitTimer.current !== null) {
      window.clearTimeout(submitTimer.current);
    }
    submitTimer.current = window.setTimeout(() => {
      form.requestSubmit();
    }, delay);
  }

  return (
    <div
      onChange={handleChange}
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onInput={handleInput}
    >
      {children}
    </div>
  );
}
