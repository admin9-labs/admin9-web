import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message } from '@arco-design/web-vue';
import { getToken } from '@/utils/auth';

export interface HttpResponse<T = unknown> {
  success: boolean;
  message: string;
  code: number;
  data: T;
  request_id: string;
  errors?: Record<string, string[]>;
  error_code?: string;
}

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // let each request carry token
    // this example using the JWT token
    // Authorization is a custom headers key
    // please modify it according to the actual situation
    const token = getToken();
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 定制分页参数
    if (config.params?.current) {
      config.params.page = config.params.current;
      delete config.params.current;
    }
    if (config.params?.pageSize) {
      config.params.page_size = config.params.pageSize;
      delete config.params.pageSize;
    }
    return config;
  },
  (error) => {
    // do something
    return Promise.reject(error);
  }
);
// add response interceptors
axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    const res = response.data;
    // if the custom code is not 0, it is judged as an error.
    if (res.code !== 0) {
      Message.error({
        content: res.message || 'Error',
        duration: 5 * 1000,
      });
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res;
  },
  (error) => {
    const requestError = error as {
      message?: string;
      response?: { data?: Partial<HttpResponse> };
    };
    const message = requestError.response?.data?.message || requestError.message || 'Request Error';
    Message.error({
      content: message,
      duration: 5 * 1000,
    });
    return Promise.reject(new Error(message));
  }
);
