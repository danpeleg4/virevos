import axios, { AxiosRequestConfig } from "axios";

export interface AxiosClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export class AxiosApiClient implements AxiosClient {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axios.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axios.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axios.patch<T>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axios.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axios.delete<T>(url, config);
    return response.data;
  }
}

export const axiosApiClient = new AxiosApiClient();
