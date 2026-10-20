import { adminApi } from '@/api/client';
import type { components, operations } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type DictTypeReference = components['schemas']['DictionaryTypeResource'];
export type DictItemRecord = components['schemas']['DictionaryItemResource'];
export type DictTypeRecord = components['schemas']['DictionaryTypeResource'];

type DictTypeQuery = NonNullable<operations['admin.dictionary-types.index']['parameters']['query']>;
type DictItemQuery = NonNullable<operations['admin.dictionary-items.index']['parameters']['query']>;

export interface DictTypeListParams extends Omit<DictTypeQuery, 'is_active' | 'sort' | 'page' | 'page_size'> {
  is_active?: boolean;
  sorts?: string;
  current?: number;
  pageSize?: number;
}

export type DictTypeCreateData = components['schemas']['StoreDictionaryTypeRequest'];
export type DictTypeUpdateData = components['schemas']['UpdateDictionaryTypeRequest'];

export interface DictItemListParams
  extends Omit<DictItemQuery, 'dictionary_type_id' | 'type_code:type$code' | 'is_active' | 'sort' | 'page' | 'page_size'> {
  dictionary_type_id?: number;
  type_code?: string;
  is_active?: boolean;
  sorts?: string;
  current?: number;
  pageSize?: number;
}

export type DictItemCreateData = components['schemas']['StoreDictionaryItemRequest'];
export type DictItemUpdateData = components['schemas']['UpdateDictionaryItemRequest'];

type DictTypeListResponse = ApiOperationResponse<'admin.dictionary-types.index', 200>;
type DictTypeDetailResponse = ApiOperationResponse<'admin.dictionary-types.show', 200>;
type DictTypeCreateResponse = ApiOperationResponse<'admin.dictionary-types.store', 200>;
type DictTypeUpdateResponse = ApiOperationResponse<'admin.dictionary-types.update', 200>;
type DictTypeDeleteResponse = ApiOperationResponse<'admin.dictionary-types.destroy', 200>;
type DictItemListResponse = ApiOperationResponse<'admin.dictionary-items.index', 200>;
type DictItemDetailResponse = ApiOperationResponse<'admin.dictionary-items.show', 200>;
type DictItemCreateResponse = ApiOperationResponse<'admin.dictionary-items.store', 200>;
type DictItemUpdateResponse = ApiOperationResponse<'admin.dictionary-items.update', 200>;
type DictItemDeleteResponse = ApiOperationResponse<'admin.dictionary-items.destroy', 200>;

export function queryDictTypeList(params?: DictTypeListParams) {
  return adminApi.get<unknown, DictTypeListResponse>('/dictionary-types', { params });
}

export function queryDictTypeDetail(id: number) {
  return adminApi.get<unknown, DictTypeDetailResponse>(`/dictionary-types/${id}`);
}

export function createDictType(data: DictTypeCreateData) {
  return adminApi.post<unknown, DictTypeCreateResponse>('/dictionary-types', data);
}

export function updateDictType(id: number, data: DictTypeUpdateData) {
  return adminApi.put<unknown, DictTypeUpdateResponse>(`/dictionary-types/${id}`, data);
}

export function deleteDictType(id: number) {
  return adminApi.delete<unknown, DictTypeDeleteResponse>(`/dictionary-types/${id}`);
}

export function queryDictItemList(params?: DictItemListParams) {
  return adminApi.get<unknown, DictItemListResponse>('/dictionary-items', { params });
}

export function queryDictItemDetail(id: number) {
  return adminApi.get<unknown, DictItemDetailResponse>(`/dictionary-items/${id}`);
}

export function createDictItem(data: DictItemCreateData) {
  return adminApi.post<unknown, DictItemCreateResponse>('/dictionary-items', data);
}

export function updateDictItem(id: number, data: DictItemUpdateData) {
  return adminApi.put<unknown, DictItemUpdateResponse>(`/dictionary-items/${id}`, data);
}

export function deleteDictItem(id: number) {
  return adminApi.delete<unknown, DictItemDeleteResponse>(`/dictionary-items/${id}`);
}
