import axios from 'axios';
import type { HttpResponse } from '@/api/interceptor';

export interface DictTypeReference {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sort: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface DictTypeListParams {
  code?: string;
  name?: string;
  is_active?: boolean;
  keyword?: string;
  sort?: string;
  current?: number;
  pageSize?: number;
}

export interface DictTypeCreateData {
  name: string;
  code: string;
  description?: string | null;
  sort?: number;
  is_active?: boolean;
}

export type DictTypeUpdateData = DictTypeCreateData;

export interface DictItemRecord {
  id: number;
  dictionary_type_id: number;
  name: string;
  code: string;
  value: string | null;
  description: string | null;
  meta: Record<string, unknown> | unknown[] | null;
  sort: number;
  is_active: boolean;
  type?: DictTypeReference;
  created_at: string | null;
  updated_at: string | null;
}

export interface DictTypeRecord extends DictTypeReference {
  items_count?: number;
  items?: DictItemRecord[];
}

export interface DictItemListParams {
  dictionary_type_id?: number;
  type_code?: string;
  code?: string;
  name?: string;
  value?: string;
  is_active?: boolean;
  keyword?: string;
  sort?: string;
  current?: number;
  pageSize?: number;
}

export interface DictItemCreateData {
  dictionary_type_id: number;
  name: string;
  code: string;
  value?: string | null;
  description?: string | null;
  meta?: Record<string, unknown> | unknown[] | null;
  sort?: number;
  is_active?: boolean;
}

export type DictItemUpdateData = Omit<DictItemCreateData, 'dictionary_type_id'> & {
  dictionary_type_id?: number;
};

interface DictTypeResponseData {
  dictionary_type: DictTypeRecord;
}

interface DictItemResponseData {
  dictionary_item: DictItemRecord;
}

const DICT_TYPE_URL = '/api/admin/dictionary-types';
const DICT_ITEM_URL = '/api/admin/dictionary-items';

export function queryDictTypeList(params?: DictTypeListParams) {
  return axios.get<unknown, HttpResponse<DictTypeRecord[]>>(DICT_TYPE_URL, { params });
}

export function queryDictTypeDetail(id: number) {
  return axios.get<unknown, HttpResponse<DictTypeResponseData>>(`${DICT_TYPE_URL}/${id}`);
}

export function createDictType(data: DictTypeCreateData) {
  return axios.post<unknown, HttpResponse<DictTypeResponseData>>(DICT_TYPE_URL, data);
}

export function updateDictType(id: number, data: DictTypeUpdateData) {
  return axios.put<unknown, HttpResponse<DictTypeResponseData>>(`${DICT_TYPE_URL}/${id}`, data);
}

export function deleteDictType(id: number) {
  return axios.delete<unknown, HttpResponse<null>>(`${DICT_TYPE_URL}/${id}`);
}

export function queryDictItemList(params?: DictItemListParams) {
  return axios.get<unknown, HttpResponse<DictItemRecord[]>>(DICT_ITEM_URL, { params });
}

export function queryDictItemDetail(id: number) {
  return axios.get<unknown, HttpResponse<DictItemResponseData>>(`${DICT_ITEM_URL}/${id}`);
}

export function createDictItem(data: DictItemCreateData) {
  return axios.post<unknown, HttpResponse<DictItemResponseData>>(DICT_ITEM_URL, data);
}

export function updateDictItem(id: number, data: DictItemUpdateData) {
  return axios.put<unknown, HttpResponse<DictItemResponseData>>(`${DICT_ITEM_URL}/${id}`, data);
}

export function deleteDictItem(id: number) {
  return axios.delete<unknown, HttpResponse<null>>(`${DICT_ITEM_URL}/${id}`);
}
