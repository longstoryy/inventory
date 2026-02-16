import crypto from 'crypto'

/**
 * Paystack API Service
 * Documentation: https://paystack.com/docs/api
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

interface PaystackResponse<T> {
    status: boolean
    message: string
    data: T
}

interface PaystackCustomer {
    id: number
    customer_code: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
}

interface PaystackPlan {
    id: number
    name: string
    plan_code: string
    amount: number
    interval: 'monthly' | 'annually'
    currency: string
}

interface PaystackSubscription {
    id: number
    subscription_code: string
    email_token: string
    status: 'active' | 'non-renewing' | 'attention' | 'completed' | 'cancelled'
    amount: number
    next_payment_date: string
    plan: PaystackPlan
    customer: PaystackCustomer
}

interface PaystackTransaction {
    id: number
    reference: string
    amount: number
    currency: string
    status: 'success' | 'failed' | 'pending'
    paid_at: string | null
    customer: PaystackCustomer
}

interface InitializeTransactionParams {
    email: string
    amount: number // in pesewas (1 GHS = 100 pesewas)
    currency?: string
    plan?: string
    callback_url?: string
    metadata?: Record<string, unknown>
}

interface InitializeTransactionResponse {
    authorization_url: string
    access_code: string
    reference: string
}

async function paystackRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<PaystackResponse<T>> {
    const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Paystack API error')
    }

    return response.json()
}

export const paystack = {
    /**
     * Initialize a transaction for one-time payment or subscription
     */
    async initializeTransaction(params: InitializeTransactionParams) {
        return paystackRequest<InitializeTransactionResponse>('/transaction/initialize', {
            method: 'POST',
            body: JSON.stringify({
                ...params,
                amount: params.amount, // Already in pesewas
                currency: params.currency || 'GHS',
            }),
        })
    },

    /**
     * Verify a transaction by reference
     */
    async verifyTransaction(reference: string) {
        return paystackRequest<PaystackTransaction>(`/transaction/verify/${reference}`)
    },

    /**
     * Create a customer
     */
    async createCustomer(params: { email: string; first_name?: string; last_name?: string; phone?: string }) {
        return paystackRequest<PaystackCustomer>('/customer', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    },

    /**
     * Get customer by email
     */
    async getCustomer(email: string) {
        return paystackRequest<PaystackCustomer>(`/customer/${encodeURIComponent(email)}`)
    },

    /**
     * Create a subscription plan
     */
    async createPlan(params: {
        name: string
        amount: number
        interval: 'monthly' | 'annually'
        currency?: string
    }) {
        return paystackRequest<PaystackPlan>('/plan', {
            method: 'POST',
            body: JSON.stringify({
                ...params,
                currency: params.currency || 'GHS',
            }),
        })
    },

    /**
     * Get all plans
     */
    async getPlans() {
        return paystackRequest<PaystackPlan[]>('/plan')
    },

    /**
     * Create a subscription
     */
    async createSubscription(params: {
        customer: string // customer code or email
        plan: string // plan code
        start_date?: string
    }) {
        return paystackRequest<PaystackSubscription>('/subscription', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    },

    /**
     * Get subscription details
     */
    async getSubscription(idOrCode: string) {
        return paystackRequest<PaystackSubscription>(`/subscription/${idOrCode}`)
    },

    /**
     * Enable a subscription
     */
    async enableSubscription(params: { code: string; token: string }) {
        return paystackRequest('/subscription/enable', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    },

    /**
     * Disable a subscription
     */
    async disableSubscription(params: { code: string; token: string }) {
        return paystackRequest('/subscription/disable', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    },

    /**
     * Generate a subscription link for customer to update card
     */
    async getSubscriptionManageLink(subscriptionCode: string) {
        return paystackRequest<{ link: string }>(`/subscription/${subscriptionCode}/manage/link`)
    },

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET_KEY)
            .update(payload)
            .digest('hex')
        return hash === signature
    },
}

export type {
    PaystackCustomer,
    PaystackPlan,
    PaystackSubscription,
    PaystackTransaction,
    InitializeTransactionParams
}
