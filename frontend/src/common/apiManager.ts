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

  private async handleResponse<T>(response: Response): Promise<T> {
    const responseData: T = await response.json();

    if (response.ok) {
      return responseData;
    } else {
      throw {
        statusCode: response.status,
        message:
          // @ts-ignore
          responseData.error ??
          "Something wrong happened, please try again or contact founders@dsensei.app.",
      };
    }
  }

  public async get<T>(endpoint: string): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
    const response = await fetch(requestUrl, {
      cache: "no-cache",
      headers: jsonRequestHeaders,
    });

    return this.handleResponse<T>(response);
  }

  public async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
    const response = await fetch(requestUrl, {
      cache: "no-cache",
      method: "POST",
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  public async post<T>(endpoint: string, body: object): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
    const response = await fetch(requestUrl, {
      cache: "no-cache",
      method: "POST",
      headers: jsonRequestHeaders,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  public async put<T>(endpoint: string, body: object): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
    const response = await fetch(requestUrl, {
      cache: "no-cache",
      method: "PUT",
      headers: jsonRequestHeaders,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  // Add methods for other HTTP methods like PUT, DELETE, etc. as needed
  // Delete
  public async delete<T>(endpoint: string): Promise<T> {
    const requestUrl = (this.baseUrl + endpoint).replace(/([^:]\/)\/+/g, "$1");
    const response = await fetch(requestUrl, {
      cache: "no-cache",
      method: "DELETE",
      headers: jsonRequestHeaders,
    });

    return this.handleResponse<T>(response);
  }
}

const apiManager = new APIManager();
export default apiManager;
