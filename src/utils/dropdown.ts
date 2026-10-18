export function revealDropdownOption(list: HTMLElement, option: HTMLElement): void {
  if (list.clientHeight === 0) return;
  const listTop = list.getBoundingClientRect().top + list.clientTop;
  const listBottom = listTop + list.clientHeight;
  const optionRect = option.getBoundingClientRect();

  if (optionRect.top < listTop) {
    list.scrollTop -= listTop - optionRect.top;
  } else if (optionRect.bottom > listBottom) {
    list.scrollTop += optionRect.bottom - listBottom;
  }
}
