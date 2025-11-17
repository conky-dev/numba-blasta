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
      targetCategories?: string[] | null;
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
      targetCategories?: string[] | null;
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

    /**
     * Cancel a scheduled campaign
     */
    cancel: async (id: string) => {
      return this.post(`/api/campaigns/${id}/cancel`);
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
      category?: string | string[];
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
      category?: string | string[];
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
    import: async (
      file: File,
      category?: string,
      mapping?: Record<string, string>
    ) => {
      const formData = new FormData();
      formData.append('file', file);
      if (category) {
        formData.append('category', category);
      }
      if (mapping && Object.keys(mapping).length > 0) {
        formData.append('mapping', JSON.stringify(mapping));
      }
      
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData, // Don't set Content-Type, let browser set it with boundary
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || 'Import failed' };
      }

      return { data, success: true };
    },

    /**
     * Get categories with contact counts
     */
    getCategoriesWithCounts: async () => {
      return this.get('/api/contacts/categories');
    },
  };

  // ============================================
  // BILLING API
  // ============================================

  billing = {
    /**
     * Get current SMS balance
     */
    getBalance: async () => {
      return this.get('/api/billing/balance');
    },

    /**
     * Add funds to balance
     */
    addFunds: async (data: {
      amount: number;
      paymentMethod?: string;
      paymentIntentId?: string;
      description?: string;
    }) => {
      return this.post('/api/billing/add-funds', data);
    },

    /**
     * Get transaction history
     */
    getTransactions: async (params?: { limit?: number; offset?: number; type?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.type) queryParams.append('type', params.type);
      
      const query = queryParams.toString();
      return this.get(`/api/billing/transactions${query ? `?${query}` : ''}`);
    },
  };

  // ============================================
  // SMS API
  // ============================================

  sms = {
    /**
     * Send a single SMS
     */
    send: async (data: {
      to: string;
      message?: string;
      templateId?: string;
      variables?: Record<string, any>;
      scheduledAt?: string;
    }) => {
      return this.post('/api/sms/send', data);
    },

    /**
     * Send SMS to multiple recipients (batch)
     */
    sendBatch: async (data: {
      to: string[]; // Array of phone numbers
      message?: string;
      templateId?: string;
      variables?: Record<string, any>;
    }) => {
      return this.post('/api/sms/batch', data);
    },

    /**
     * Send bulk SMS to all contacts in the organization
     */
    bulkSend: async (data: {
      message?: string;
      templateId?: string;
      variables?: Record<string, any>;
    }) => {
      return this.post('/api/sms/bulk-send', data);
    },

    /**
     * Get SMS message history with pagination
     */
    getMessages: async (params: {
      limit?: number;
      offset?: number;
      search?: string;
      searchField?: 'to_number' | 'from_number' | 'body';
      fromDate?: string;
      toDate?: string;
      sortField?: 'created_at' | 'to_number' | 'from_number' | 'status' | 'body';
      sortDirection?: 'asc' | 'desc';
    } = {}) => {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.searchField) queryParams.append('searchField', params.searchField);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      if (params.sortField) queryParams.append('sortField', params.sortField);
      if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

      return this.get(`/api/sms/messages?${queryParams.toString()}`);
    },

    /**
     * Get conversation list
     */
    getConversations: async (params: {
      limit?: number;
      offset?: number;
      search?: string;
      category?: string;
    } = {}) => {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);

      return this.get(`/api/sms/conversations?${queryParams.toString()}`);
    },

    /**
     * Get messages for a specific conversation
     */
    getConversationMessages: async (contactId: string, params: {
      limit?: number;
      offset?: number;
    } = {}) => {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      return this.get(`/api/sms/conversations/${contactId}/messages?${queryParams.toString()}`);
    },

    /**
     * Send a reply in a conversation
     */
    sendReply: async (contactId: string, message: string) => {
      return this.post(`/api/sms/conversations/${contactId}/reply`, { message });
    },

    /**
     * Simulate an inbound message (for testing)
     */
    simulateInbound: async (contactId: string) => {
      return this.post(`/api/sms/conversations/${contactId}/simulate-reply`, {});
    },
  };

  // ============================================
  // DASHBOARD API
  // ============================================

  dashboard = {
    /**
     * Get dashboard statistics
     */
    getStats: async (timeRange: '7days' | '30days' | '90days' | '1year' = '30days') => {
      return this.get(`/api/dashboard/stats?timeRange=${timeRange}`);
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
     * Verify email with code
     */
    verifyCode: async (email: string, code: string) => {
      return this.post('/api/auth/verify-code', { email, code }, { requiresAuth: false });
    },

    /**
     * Resend email verification code
     */
    resendCode: async (email: string) => {
      return this.post('/api/auth/resend-code', { email }, { requiresAuth: false });
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

