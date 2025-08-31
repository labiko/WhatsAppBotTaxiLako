// ═══════════════════════════════════════════════════════════════
// 💳 SERVICE DÉDIÉ LENGOPAY - ZÉRO RÉGRESSION SUR WORKFLOW EXISTANT
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  LENGOPAY_CONFIG, 
  LOCAL_ENDPOINTS, 
  LengoPayConfigManager,
  LENGOPAY_DEBUG_INFO 
} from './lengopay-config.ts';

// 🔑 CONFIGURATION SUPABASE
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface PaymentRequest {
  amount: number;
  clientPhone: string;
  reservationId?: string;
  sessionData?: any;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  message?: string;
  error?: string;
}

interface PaymentStatusResponse {
  success: boolean;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  message?: string;
  paymentData?: any;
}

class LengoPayService {
  private supabase;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  /**
   * 💳 CRÉER PAIEMENT LENGOPAY
   * @param amount Montant en GNF
   * @param clientPhone Téléphone client (format: +224...)
   * @param reservationId ID de la réservation (optionnel)
   */
  async createPayment(
    amount: number,
    clientPhone: string,
    reservationId?: string
  ): Promise<PaymentResponse> {
    try {
      console.log(`🔄 [LengoPay] Création paiement: ${amount} GNF pour ${clientPhone}`);

      // Normaliser le téléphone
      const normalizedPhone = LengoPayConfigManager.normalizePhoneNumber(clientPhone);

      // 🌐 CRÉER PAYLOAD DEPUIS CONFIG
      const paymentPayload = {
        websiteid: LENGOPAY_CONFIG.websiteId,
        amount: amount,
        currency: LENGOPAY_CONFIG.currency,
        type_account: "lp-om-gn",  // Orange Money Guinée
        account: normalizedPhone,
        callback_url: LENGOPAY_CONFIG.callbackUrl,
        return_url: LENGOPAY_CONFIG.returnUrl
      };

      console.log(`📦 [LengoPay] Payload depuis config:`, paymentPayload);

      // 🌐 APPEL API AVEC CONFIG
      const response = await fetch(LENGOPAY_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${LENGOPAY_CONFIG.licenseKey}`
        },
        body: JSON.stringify(paymentPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log(`📥 [LengoPay] Réponse API sandbox:`, paymentData);

      if (paymentData.status === "Success" && paymentData.payment_url) {
        // 💾 SAUVEGARDER DIRECTEMENT DANS LENGOPAY_PAYMENTS
        await this.saveToLengoPayTable({
          paymentId: paymentData.pay_id,
          clientPhone,
          amount,
          paymentUrl: paymentData.payment_url,
          status: 'PENDING',
          reservationId,
          createdAt: new Date().toISOString()
        });

        return {
          success: true,
          paymentId: paymentData.pay_id,
          paymentUrl: paymentData.payment_url,
          message: 'Paiement créé avec succès'
        };
      } else {
        return {
          success: false,
          error: paymentData.message || 'Erreur création paiement',
          message: 'Échec création paiement LengoPay'
        };
      }

    } catch (error) {
      console.error('❌ [LengoPay] Erreur création paiement:', error);
      return {
        success: false,
        error: error.message,
        message: 'Erreur technique lors de la création du paiement'
      };
    }
  }

  /**
   * 🔍 VÉRIFIER STATUT PAIEMENT - UNIQUEMENT LENGOPAY_PAYMENTS
   * @param paymentId ID du paiement LengoPay
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      console.log(`🔍 [LengoPay] Vérification statut: ${paymentId}`);

      // VÉRIFIER UNIQUEMENT TABLE LENGOPAY_PAYMENTS
      const { data: payment } = await this.supabase
        .from('lengopay_payments')
        .select('*')
        .eq('payment_id', paymentId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (payment) {
        console.log(`📋 [LengoPay] Paiement trouvé, statut: ${payment.status}`);
        
        return {
          success: true,
          status: payment.status,
          message: payment.status === 'SUCCESS' ? 'Paiement confirmé' : `Statut: ${payment.status}`,
          paymentData: payment
        };
      }

      // 2. SI PAS DE SUCCESS LOCAL, VÉRIFIER SUR LE SERVEUR
      const response = await fetch(`${LENGOPAY_STATUS_ENDPOINT}?payment_id=${paymentId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const statusData = await response.json();
      console.log(`📥 [LengoPay] Statut API:`, statusData);

      // 3. DÉTECTER LE STATUT DEPUIS LA RÉPONSE
      let detectedStatus: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';
      
      if (statusData.success === true || statusData.message?.includes('SUCCESS')) {
        detectedStatus = 'SUCCESS';
      } else if (statusData.success === false && statusData.message?.includes('FAILED')) {
        detectedStatus = 'FAILED';
      }

      return {
        success: true,
        status: detectedStatus,
        message: statusData.message || 'Statut vérifié',
        paymentData: statusData
      };

    } catch (error) {
      console.error('❌ [LengoPay] Erreur vérification statut:', error);
      return {
        success: false,
        status: 'PENDING',
        message: 'Erreur technique lors de la vérification'
      };
    }
  }

  /**
   * ⏰ VÉRIFIER TIMEOUT PAIEMENT
   * @param paymentId ID du paiement
   * @param timeoutMinutes Timeout en minutes (défaut: 15)
   */
  async isPaymentExpired(paymentId: string, timeoutMinutes: number = 15): Promise<boolean> {
    try {
      const { data: payment } = await this.supabase
        .from('lengopay_payments')
        .select('processed_at')
        .eq('payment_id', paymentId)
        .single();

      if (!payment) return false;

      const createdAt = new Date(payment.processed_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      return diffMinutes > timeoutMinutes;
    } catch {
      return false;
    }
  }

  /**
   * 💾 SAUVEGARDER DANS LENGOPAY_PAYMENTS
   */
  private async saveToLengoPayTable(paymentData: any): Promise<void> {
    try {
      const lengoPayData = {
        payment_id: paymentData.paymentId,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: "GNF",
        client_phone: paymentData.clientPhone,
        message: "Paiement initié depuis bot",
        reservation_id: paymentData.reservationId,  // 🔥 AJOUT: stocker directement dans la colonne
        raw_json: {
          payment_url: paymentData.paymentUrl,
          created_from: "payment-service",
          reservation_id: paymentData.reservationId
        },
        processed_at: paymentData.createdAt,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('lengopay_payments')
        .upsert(lengoPayData);

      if (error) {
        console.error('❌ [LengoPay] Erreur sauvegarde lengopay_payments:', error);
      } else {
        console.log('✅ [LengoPay] Sauvegardé dans lengopay_payments');
      }
    } catch (error) {
      console.error('❌ [LengoPay] Erreur sauvegarde lengopay_payments:', error);
    }
  }
}

// 🚀 EDGE FUNCTION HANDLER
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const lengoPayService = new LengoPayService();
    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get('action');

    if (method === 'POST' && action === 'create') {
      // 💳 CRÉER PAIEMENT
      const body: PaymentRequest = await req.json();
      const result = await lengoPayService.createPayment(
        body.amount,
        body.clientPhone,
        body.reservationId
      );

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && action === 'status') {
      // 🔍 VÉRIFIER STATUT
      const paymentId = url.searchParams.get('paymentId');
      if (!paymentId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'paymentId requis'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await lengoPayService.checkPaymentStatus(paymentId);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && action === 'expired') {
      // ⏰ VÉRIFIER TIMEOUT
      const paymentId = url.searchParams.get('paymentId');
      const timeoutMinutes = parseInt(url.searchParams.get('timeout') || '15');
      
      if (!paymentId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'paymentId requis'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const isExpired = await lengoPayService.isPaymentExpired(paymentId, timeoutMinutes);

      return new Response(JSON.stringify({
        success: true,
        expired: isExpired,
        message: isExpired ? 'Paiement expiré' : 'Paiement encore valide'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Action non supportée',
        usage: {
          create: 'POST /?action=create',
          status: 'GET /?action=status&paymentId=xxx',
          expired: 'GET /?action=expired&paymentId=xxx&timeout=15'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ [PaymentService] Erreur globale:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Erreur interne du service de paiement'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log('💳 [PaymentService] Service LengoPay démarré');
console.log('🔧 [PaymentService] Configuration:', LENGOPAY_DEBUG_INFO);