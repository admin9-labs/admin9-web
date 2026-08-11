import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import type { AdminOperationResponse } from '@/api/generated/contracts';

export type DictTypeReference = components['schemas']['DictionaryTypeResource'];
export type DictItemRecord = components['schemas']['DictionaryItemResource'];
export type DictTypeRecord = components['schemas']['DictionaryTypeResource'];

type DictTypeQuery = NonNullable<operations['admin.dictionary-types.index']['parameters']['query']>;
type DictItemQuery = NonNullable<operations['admin.dictionary-items.index']['parameters']['query']>;

export interface DictTypeListParams extends Omit<DictTypeQuery, 'is_active' | 'page' | 'page_size'> {
  is_active?: boolean;
  current?: number;
  pageSize?: number;
}

export type DictTypeCreateData = components['schemas']['StoreDictionaryTypeRequest'];
export type DictTypeUpdateData = components['schemas']['UpdateDictionaryTypeRequest'];

export interface DictItemListParams
  extends Omit<DictItemQuery, 'dictionary_type_id' | 'type_code:type$code' | 'is_active' | 'page' | 'page_size'> {
  dictionary_type_id?: number;
  type_code?: string;
  is_active?: boolean;
  current?: number;
  pageSize?: number;
}

export type DictItemCreateData = components['schemas']['StoreDictionaryItemRequest'];
export type DictItemUpdateData = components['schemas']['UpdateDictionaryItemRequest'];

type DictTypeListResponse = AdminOperationResponse<'admin.dictionary-types.index', 200>;
type DictTypeDetailResponse = AdminOperationResponse<'admin.dictionary-types.show', 200>;
type DictTypeCreateResponse = AdminOperationResponse<'admin.dictionary-types.store', 200>;
type DictTypeUpdateResponse = AdminOperationResponse<'admin.dictionary-types.update', 200>;
type DictTypeDeleteResponse = AdminOperationResponse<'admin.dictionary-types.destroy', 200>;
type DictItemListResponse = AdminOperationResponse<'admin.dictionary-items.index', 200>;
type DictItemDetailResponse = AdminOperationResponse<'admin.dictionary-items.show', 200>;
type DictItemCreateResponse = AdminOperationResponse<'admin.dictionary-items.store', 200>;
type DictItemUpdateResponse = AdminOperationResponse<'admin.dictionary-items.update', 200>;
type DictItemDeleteResponse = AdminOperationResponse<'admin.dictionary-items.destroy', 200>;

const DICT_TYPE_URL = '/api/admin/dictionary-types';
const DICT_ITEM_URL = '/api/admin/dictionary-items';

export function queryDictTypeList(params?: DictTypeListParams) {
  return axios.get<unknown, DictTypeListResponse>(DICT_TYPE_URL, { params });
}

export function queryDictTypeDetail(id: number) {
  return axios.get<unknown, DictTypeDetailResponse>(`${DICT_TYPE_URL}/${id}`);
}

export function createDictType(data: DictTypeCreateData) {
  return axios.post<unknown, DictTypeCreateResponse>(DICT_TYPE_URL, data);
}

export function updateDictType(id: number, data: DictTypeUpdateData) {
  return axios.put<unknown, DictTypeUpdateResponse>(`${DICT_TYPE_URL}/${id}`, data);
}

export function deleteDictType(id: number) {
  return axios.delete<unknown, DictTypeDeleteResponse>(`${DICT_TYPE_URL}/${id}`);
}

export function queryDictItemList(params?: DictItemListParams) {
  return axios.get<unknown, DictItemListResponse>(DICT_ITEM_URL, { params });
}

export function queryDictItemDetail(id: number) {
  return axios.get<unknown, DictItemDetailResponse>(`${DICT_ITEM_URL}/${id}`);
}

export function createDictItem(data: DictItemCreateData) {
  return axios.post<unknown, DictItemCreateResponse>(DICT_ITEM_URL, data);
}

export function updateDictItem(id: number, data: DictItemUpdateData) {
  return axios.put<unknown, DictItemUpdateResponse>(`${DICT_ITEM_URL}/${id}`, data);
}

export function deleteDictItem(id: number) {
  return axios.delete<unknown, DictItemDeleteResponse>(`${DICT_ITEM_URL}/${id}`);
}
