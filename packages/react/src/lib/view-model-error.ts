export function viewModelError(code: number, detail?: string) {
  const prefix = process.env.NODE_ENV !== 'production' && detail ? `${detail}\nMore info: ` : '';
  return new Error(`Error #${code}: ${prefix}https://js2me.github.io/mobx-view-model/errors/${code}`);
}
