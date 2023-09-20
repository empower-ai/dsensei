import axios, { AxiosError, AxiosProgressEvent, AxiosResponse } from "axios";
import url from "url";

export interface T {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
}

const jsonRequestHeaders = {
  "Content-Type": "application/json",
};
const currentProtocol = window.location.protocol;
const currentHostname = window.location.hostname;

//TODO: add auth token
//FIXME: sub API implementation
export class APIManager {
  private baseUrl: string;

  constructor(suffix: string = "") {
    this.baseUrl = url.resolve(
      process.env.NODE_ENV === "development"
        ? `${currentProtocol}//${currentHostname}:5001`
        : "",
      suffix
    );
  }

  private async handleRequest<T>(
    request: () => Promise<AxiosResponse<T, any>>
  ): Promise<T> {
    try {
      return (await request()).data;
    } catch (e) {
      if (e instanceof AxiosError) {
        // eslint-disable-next-line no-throw-literal
        throw {
          statusCode: e.response?.status,
          error: e.response?.data.error,
          message:
            e.response?.data.error ??
            "Something wrong happened, please try again or contact founders@dsensei.app.",
        };
      } else {
        throw e;
      }
    }
  }

  private getRequestUrl(endpoint: string): string {
    return (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
  }

  public async get<T>(endpoint: string): Promise<T> {
    return await this.handleRequest<T>(
      async () =>
        await axios.get<T>(this.getRequestUrl(endpoint), {
          headers: jsonRequestHeaders,
        })
    );
  }

  public async postForm<T>(
    endpoint: string,
    formData: FormData,
    onUploadProgress: (progressEvent: AxiosProgressEvent) => void = (
      event
    ) => {}
  ): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");

    return await this.handleRequest<T>(
      async () =>
        await axios.post<T>(requestUrl, formData, {
          onUploadProgress,
        })
    );
  }

  public async post<T>(endpoint: string, body: object): Promise<T> {
    return await this.handleRequest<T>(
      async () =>
        await axios.post<T>(this.getRequestUrl(endpoint), body, {
          headers: jsonRequestHeaders,
        })
    );
  }

  public async put<T>(endpoint: string, body: object): Promise<T> {
    return await this.handleRequest<T>(
      async () =>
        await axios.put<T>(this.getRequestUrl(endpoint), body, {
          headers: jsonRequestHeaders,
        })
    );
  }

  public async delete<T>(endpoint: string): Promise<T> {
    return await this.handleRequest<T>(
      async () =>
        await axios.delete<T>(this.getRequestUrl(endpoint), {
          headers: jsonRequestHeaders,
        })
    );
  }
}

const apiManager = new APIManager();
export default apiManager;
