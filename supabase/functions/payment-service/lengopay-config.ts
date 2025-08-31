// ═══════════════════════════════════════════════════════════════
// 💳 CONFIGURATION LENGOPAY - PARAMÈTRES PRODUCTION
// ═══════════════════════════════════════════════════════════════

export interface LengoPayConfig {
  apiUrl: string;
  licenseKey: string;
  websiteId: string;
  callbackUrl: string;
  returnUrl: string;
  currency: string;
  timeout: number;
}

export interface LengoPayPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customer_phone: string;
  website_id: string;
  callback_url: string;
  return_url: string;
}

export interface LengoPayPaymentResponse {
  status: string;
  pay_id?: string;
  payment_url?: string;
  message?: string;
  error?: string;
}

// 🔧 CONFIGURATION LENGOPAY PRODUCTION
export const LENGOPAY_CONFIG: LengoPayConfig = {
  apiUrl: "https://sandbox.lengopay.com/api/v1/payments",
  licenseKey: "VmVHNGZud2h1YVdUUnBSYnZ1R3BlNmtMTFhHN1NDNGpaU3plMENtQ1drZ084Y280S2J5ODZPWXJQVWZRT05OWg==",
  websiteId: "wyp6J7uN3pVG2Pjn",
  callbackUrl: "https://www.labico.net/api/LengoPayCallback",
  returnUrl: "https://www.labico.net/payment-success",
  currency: "GNF",
  timeout: 30000 // 30 secondes
};

// 🌐 ENDPOINTS LOCAUX POUR TESTS/FALLBACK
export const LOCAL_ENDPOINTS = {
  serverUrl: "https://www.labico.net",
  createTest: "https://www.labico.net/api/LengoPayCreateTest",
  updateTest: "https://www.labico.net/api/TestUpdatePayment",
  callback: "https://www.labico.net/api/LengoPayCallback"
};

// 🔧 UTILITAIRES CONFIGURATION
export class LengoPayConfigManager {
  
  /**
   * 🔧 CRÉER PAYLOAD PAIEMENT
   * @param amount Montant en GNF
   * @param customerPhone Téléphone client
   * @param description Description du paiement (optionnel)
   */
  static createPaymentPayload(
    amount: number,
    customerPhone: string,
    description?: string
  ): LengoPayPaymentRequest {
    return {
      amount: amount,
      currency: LENGOPAY_CONFIG.currency,
      description: description || `Paiement taxi ${amount} GNF`,
      customer_phone: customerPhone,
      website_id: LENGOPAY_CONFIG.websiteId,
      callback_url: LENGOPAY_CONFIG.callbackUrl,
      return_url: LENGOPAY_CONFIG.returnUrl
    };
  }

  /**
   * 🔑 HEADERS AUTHENTIFICATION LENGOPAY
   */
  static getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': LENGOPAY_CONFIG.licenseKey,
      'Accept': 'application/json'
    };
  }

  /**
   * 🔍 VALIDER RÉPONSE LENGOPAY
   * @param response Réponse API LengoPay
   */
  static validatePaymentResponse(response: any): LengoPayPaymentResponse {
    if (!response) {
      return {
        status: "Error",
        error: "Réponse API vide",
        message: "Aucune réponse de LengoPay"
      };
    }

    return {
      status: response.status || "Error",
      pay_id: response.pay_id,
      payment_url: response.payment_url,
      message: response.message,
      error: response.error
    };
  }

  /**
   * 📞 NORMALISER NUMÉRO TÉLÉPHONE
   * @param phone Numéro brut
   */
  static normalizePhoneNumber(phone: string): string {
    return phone
      .replace('whatsapp:', '')
      .replace('+', '')
      .replace(/\s/g, '')
      .trim();
  }

  /**
   * ✅ VÉRIFIER SUCCÈS PAIEMENT
   * @param response Réponse LengoPay
   */
  static isPaymentSuccess(response: LengoPayPaymentResponse): boolean {
    return response.status === "Success" && 
           !!response.pay_id && 
           !!response.payment_url;
  }

  /**
   * 🔧 CONFIGURATION DEBUG
   */
  static getDebugInfo(): any {
    return {
      apiUrl: LENGOPAY_CONFIG.apiUrl,
      websiteId: LENGOPAY_CONFIG.websiteId,
      callbackUrl: LENGOPAY_CONFIG.callbackUrl,
      currency: LENGOPAY_CONFIG.currency,
      licenseKeyPresent: !!LENGOPAY_CONFIG.licenseKey,
      licenseKeyLength: LENGOPAY_CONFIG.licenseKey?.length || 0
    };
  }
}

// 📝 EXPORT POUR LOGS
export const LENGOPAY_DEBUG_INFO = LengoPayConfigManager.getDebugInfo();