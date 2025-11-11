/**
 * API Client Wrapper
 * Handles authentication and API calls for the SMSblast application
 */

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Make an API request
   */
  private async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = true, headers = {}, ...restOptions } = options;

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    // Add auth token if required
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...restOptions,
        headers: requestHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || `Request failed with status ${response.status}`,
        };
      }

      return { data, success: true };
    } catch (error: any) {
      return {
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // ============================================
  // CAMPAIGNS API
  // ============================================

  campaigns = {
    /**
     * List all campaigns
     */
    list: async (params?: { status?: string; search?: string; limit?: number; cursor?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.cursor) queryParams.append('cursor', params.cursor);
      
      const query = queryParams.toString();
      return this.get(`/api/campaigns${query ? `?${query}` : ''}`);
    },

    /**
     * Get a single campaign
     */
    get: async (id: string) => {
      return this.get(`/api/campaigns/${id}`);
    },

    /**
     * Create a new campaign
     */
    create: async (data: {
      name: string;
      message?: string;
      templateId?: string;
      listId?: string;
      scheduleAt?: string;
    }) => {
      return this.post('/api/campaigns', data);
    },

    /**
     * Update a campaign
     */
    update: async (id: string, data: {
      name?: string;
      message?: string;
      templateId?: string;
      listId?: string;
      scheduleAt?: string;
    }) => {
      return this.patch(`/api/campaigns/${id}`, data);
    },

    /**
     * Delete a campaign
     */
    delete: async (id: string) => {
      return this.delete(`/api/campaigns/${id}`);
    },

    /**
     * Duplicate a campaign
     */
    duplicate: async (id: string) => {
      return this.post(`/api/campaigns/${id}/duplicate`);
    },

    /**
     * Pause a campaign
     */
    pause: async (id: string) => {
      return this.patch(`/api/campaigns/${id}/pause`);
    },

    /**
     * Resume a campaign
     */
    resume: async (id: string) => {
      return this.patch(`/api/campaigns/${id}/resume`);
    },

    /**
     * Get campaign metrics
     */
    metrics: async (id: string) => {
      return this.get(`/api/campaigns/${id}/metrics`);
    },

    /**
     * Send a campaign immediately
     */
    send: async (id: string) => {
      return this.post(`/api/campaigns/${id}/send`);
    },
  };

  // ============================================
  // CONTACTS API
  // ============================================

  contacts = {
    /**
     * List all contacts
     */
    list: async (params?: { search?: string; limit?: number; cursor?: string; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.cursor) queryParams.append('cursor', params.cursor);
      if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
      
      const query = queryParams.toString();
      return this.get(`/api/contacts${query ? `?${query}` : ''}`);
    },

    /**
     * Get a single contact
     */
    get: async (id: string) => {
      return this.get(`/api/contacts/${id}`);
    },

    /**
     * Create a new contact
     */
    create: async (data: {
      firstName?: string;
      lastName?: string;
      phone: string;
      email?: string;
    }) => {
      return this.post('/api/contacts', data);
    },

    /**
     * Update a contact
     */
    update: async (id: string, data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    }) => {
      return this.patch(`/api/contacts/${id}`, data);
    },

    /**
     * Delete a contact
     */
    delete: async (id: string) => {
      return this.delete(`/api/contacts/${id}`);
    },

    /**
     * Import contacts from CSV
     */
    import: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData, // Don't set Content-Type, let browser set it with boundary
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || 'Import failed' };
      }

      return { data, success: true };
    },
  };

  // ============================================
  // TEMPLATES API
  // ============================================

  templates = {
    /**
     * List all templates
     */
    list: async (params?: { search?: string; limit?: number; cursor?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.cursor) queryParams.append('cursor', params.cursor);
      
      const query = queryParams.toString();
      return this.get(`/api/templates${query ? `?${query}` : ''}`);
    },

    /**
     * Get a single template
     */
    get: async (id: string) => {
      return this.get(`/api/templates/${id}`);
    },

    /**
     * Create a new template
     */
    create: async (data: { name: string; content: string }) => {
      return this.post('/api/templates', data);
    },

    /**
     * Update a template
     */
    update: async (id: string, data: { name?: string; content?: string }) => {
      return this.patch(`/api/templates/${id}`, data);
    },

    /**
     * Delete a template
     */
    delete: async (id: string) => {
      return this.delete(`/api/templates/${id}`);
    },

    /**
     * Preview a template (no auth required)
     */
    preview: async (data: { content: string; sampleData?: Record<string, any> }) => {
      return this.post('/api/templates/preview', data, { requiresAuth: false });
    },
  };

  // ============================================
  // AUTH API
  // ============================================

  auth = {
    /**
     * Login
     */
    login: async (email: string, password: string) => {
      return this.post('/api/auth/login', { email, password }, { requiresAuth: false });
    },

    /**
     * Signup
     */
    signup: async (email: string, password: string, fullName: string) => {
      return this.post('/api/auth/signup', { email, password, fullName }, { requiresAuth: false });
    },

    /**
     * Logout
     */
    logout: async () => {
      const response = await this.post('/api/auth/logout');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
      return response;
    },
  };
}

// Export singleton instance
export const api = new ApiClient();

// Export types
export type { ApiResponse };

