import type { operations } from './generated/admin-api';

type JsonResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]['responses']
> = operations[Operation]['responses'][Status] extends {
  content: { 'application/json': infer Body };
}
  ? Body
  : never;

export type ApiOperationResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]['responses']
> = JsonResponse<Operation, Status>;
