/**
 * MWG: accessible-error-announcement / required-field-feedback /
 * validate-input-after-interaction — sync aria-invalid with :user-invalid.
 */
export function syncAriaInvalid(input: HTMLInputElement): void {
  if (input.matches(':user-invalid')) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

export function bindUserInvalidSync(form: HTMLFormElement): () => void {
  const onBlur = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) syncAriaInvalid(target);
  };
  const onInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.getAttribute('aria-invalid') === 'true') {
      syncAriaInvalid(target);
    }
  };
  const onSubmit = () => {
    form.querySelectorAll('input').forEach((input) => {
      syncAriaInvalid(input);
    });
  };

  form.addEventListener('blur', onBlur, true);
  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);

  return () => {
    form.removeEventListener('blur', onBlur, true);
    form.removeEventListener('input', onInput);
    form.removeEventListener('submit', onSubmit);
  };
}
