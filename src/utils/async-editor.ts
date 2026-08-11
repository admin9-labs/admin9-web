export interface AsyncEditorRequest<T> {
  generation: number;
  target: T;
}

export function isCurrentEditorRequest<T>(currentGeneration: number, currentTarget: T, request: AsyncEditorRequest<T>) {
  return currentGeneration === request.generation && currentTarget === request.target;
}
