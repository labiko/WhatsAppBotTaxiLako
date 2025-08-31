// ═══════════════════════════════════════════════════════════════
// 📨 SERVICE DÉDIÉ GREEN API NOTIFICATIONS - MÉTHODES GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// 🔑 CONFIGURATION GREEN API
const GREEN_API_INSTANCE_ID = Deno.env.get('GREEN_API_INSTANCE_ID') ?? '';
const GREEN_API_TOKEN = Deno.env.get('GREEN_API_TOKEN') ?? '';
const GREEN_API_BASE_URL = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}`;

interface NotificationRequest {
  to: string;
  message: string;
  type?: 'text' | 'payment' | 'confirmation' | 'error' | 'reminder';
  priority?: 'normal' | 'high' | 'urgent';
  metadata?: {
    paymentId?: string;
    reservationId?: string;
    amount?: number;
    paymentUrl?: string;
  };
}

interface NotificationResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

// 🎨 TEMPLATES DE MESSAGES
const MESSAGE_TEMPLATES = {
  payment_request: (data: any) => `💳 **PAIEMENT REQUIS**

💰 Montant : ${data.amount?.toLocaleString('fr-FR') || '0'} GNF
🚗 ${data.vehicleType?.toUpperCase() || 'TAXI'}
📍 ${data.destination || 'Destination'}

🔗 **Cliquez pour payer avec Orange Money :**
${data.paymentUrl}

⏰ Paiement valable 15 minutes
💬 Tapez "annuler" pour annuler la réservation`,

  payment_success: (data: any) => `✅ **PAIEMENT CONFIRMÉ !**

🎉 Votre réservation est validée
💰 ${data.amount?.toLocaleString('fr-FR') || '0'} GNF payés
🚗 ${data.conducteurNom || 'Conducteur'} - ${data.conducteurTel || ''}
⏱️ Arrivée prévue : ${data.tempsArrivee || '10'} minutes
📍 ${data.destination || 'Destination'}

📱 Le conducteur a été notifié`,

  payment_failed: (data: any) => `❌ **PAIEMENT ÉCHOUÉ**

💳 Le paiement de ${data.amount?.toLocaleString('fr-FR') || '0'} GNF n'a pas abouti.

🔄 **Options :**
1️⃣ Réessayer le paiement
2️⃣ Changer de mode de paiement  
3️⃣ Annuler la réservation

💬 Tapez 1, 2 ou 3 pour choisir`,

  payment_expired: (data: any) => `⏰ **PAIEMENT EXPIRÉ**

💳 Le lien de paiement de ${data.amount?.toLocaleString('fr-FR') || '0'} GNF a expiré.

🔄 **Options :**
1️⃣ Créer un nouveau paiement
2️⃣ Modifier la réservation
3️⃣ Annuler la réservation

💬 Tapez 1, 2 ou 3 pour continuer`,

  payment_pending: (data: any) => `⏳ **PAIEMENT EN ATTENTE**

💳 Votre paiement de ${data.amount?.toLocaleString('fr-FR') || '0'} GNF est en cours de traitement...

🔗 Si vous n'avez pas encore payé, cliquez sur :
${data.paymentUrl}

💬 Tapez "statut" pour vérifier l'état du paiement`,

  generic_error: (data: any) => `❌ **ERREUR SYSTÈME**

🔧 Une erreur technique est survenue.
💬 Veuillez réessayer ou contacter le support.

📞 Support : ${data.supportPhone || '+224 XX XX XX XX'}`,
};

class GreenAPINotificationService {
  private instanceId: string;
  private token: string;

  constructor() {
    this.instanceId = GREEN_API_INSTANCE_ID;
    this.token = GREEN_API_TOKEN;

    if (!this.instanceId || !this.token) {
      throw new Error('Configuration Green API incomplète');
    }
  }

  /**
   * 📨 ENVOYER NOTIFICATION GÉNÉRIQUE
   * @param request Données de notification
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      console.log(`📨 [GreenAPI] Envoi notification ${request.type} vers ${request.to}`);

      // Normaliser le numéro de téléphone
      const normalizedPhone = this.normalizePhoneNumber(request.to);
      
      // Construire le message selon le type
      const message = this.buildMessage(request);
      
      // Configurer la priorité
      const priority = this.getPrioritySettings(request.priority);

      // Envoyer via Green API
      const response = await this.sendGreenAPIMessage(normalizedPhone, message, priority);

      return response;

    } catch (error) {
      console.error('❌ [GreenAPI] Erreur envoi notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Erreur technique lors de l\'envoi de la notification'
      };
    }
  }

  /**
   * 💳 NOTIFICATION PAIEMENT SPÉCIALISÉE
   * @param to Numéro destinataire
   * @param paymentData Données du paiement
   * @param type Type de notification paiement
   */
  async sendPaymentNotification(
    to: string,
    paymentData: any,
    type: 'request' | 'success' | 'failed' | 'expired' | 'pending'
  ): Promise<NotificationResponse> {
    const notificationRequest: NotificationRequest = {
      to,
      message: '', // Sera généré par le template
      type: 'payment',
      priority: type === 'expired' || type === 'failed' ? 'high' : 'normal',
      metadata: {
        paymentId: paymentData.paymentId,
        reservationId: paymentData.reservationId,
        amount: paymentData.amount,
        paymentUrl: paymentData.paymentUrl
      }
    };

    // Utiliser le template approprié
    const templateKey = `payment_${type}` as keyof typeof MESSAGE_TEMPLATES;
    if (MESSAGE_TEMPLATES[templateKey]) {
      notificationRequest.message = MESSAGE_TEMPLATES[templateKey](paymentData);
    } else {
      notificationRequest.message = paymentData.message || 'Notification de paiement';
    }

    return await this.sendNotification(notificationRequest);
  }

  /**
   * 🔔 NOTIFICATION SIMPLE TEXTE
   * @param to Numéro destinataire
   * @param message Message à envoyer
   * @param priority Priorité (optionnel)
   */
  async sendTextNotification(
    to: string, 
    message: string, 
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<NotificationResponse> {
    return await this.sendNotification({
      to,
      message,
      type: 'text',
      priority
    });
  }

  /**
   * 🚨 NOTIFICATION D'ERREUR
   * @param to Numéro destinataire
   * @param errorMessage Message d'erreur
   * @param context Contexte de l'erreur (optionnel)
   */
  async sendErrorNotification(
    to: string,
    errorMessage: string,
    context?: any
  ): Promise<NotificationResponse> {
    const errorData = {
      message: errorMessage,
      context: context?.context || 'Erreur système',
      supportPhone: context?.supportPhone
    };

    const message = MESSAGE_TEMPLATES.generic_error(errorData);

    return await this.sendNotification({
      to,
      message,
      type: 'error',
      priority: 'high'
    });
  }

  /**
   * 🌐 APPEL GREEN API NATIF
   * @param phone Numéro normalisé
   * @param message Message à envoyer
   * @param options Options d'envoi
   */
  private async sendGreenAPIMessage(
    phone: string,
    message: string,
    options: any = {}
  ): Promise<NotificationResponse> {
    try {
      const url = `${GREEN_API_BASE_URL}/sendMessage/${this.token}`;
      
      const payload = {
        chatId: `${phone}@c.us`,
        message: message,
        ...options
      };

      console.log(`🌐 [GreenAPI] URL: ${url}`);
      console.log(`📤 [GreenAPI] Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log(`📥 [GreenAPI] Réponse:`, responseData);

      if (response.ok && responseData.idMessage) {
        return {
          success: true,
          messageId: responseData.idMessage,
          message: 'Message envoyé avec succès'
        };
      } else {
        throw new Error(`Green API Error: ${JSON.stringify(responseData)}`);
      }

    } catch (error) {
      console.error('❌ [GreenAPI] Erreur envoi:', error);
      return {
        success: false,
        error: error.message,
        message: 'Échec envoi message Green API'
      };
    }
  }

  /**
   * 📞 NORMALISER NUMÉRO DE TÉLÉPHONE
   * @param phone Numéro brut
   */
  private normalizePhoneNumber(phone: string): string {
    return phone
      .replace('whatsapp:', '')
      .replace('+', '')
      .replace(/\s/g, '');
  }

  /**
   * 🎯 CONSTRUIRE MESSAGE SELON TYPE
   * @param request Requête de notification
   */
  private buildMessage(request: NotificationRequest): string {
    // Si message personnalisé fourni, l'utiliser
    if (request.message && request.message.trim()) {
      return request.message;
    }

    // Sinon utiliser template par défaut selon type
    const templateData = {
      ...request.metadata,
      type: request.type,
      priority: request.priority
    };

    switch (request.type) {
      case 'payment':
        return MESSAGE_TEMPLATES.payment_request(templateData);
      case 'error':
        return MESSAGE_TEMPLATES.generic_error(templateData);
      default:
        return request.message || 'Notification système';
    }
  }

  /**
   * ⚙️ PARAMÈTRES DE PRIORITÉ
   * @param priority Niveau de priorité
   */
  private getPrioritySettings(priority?: string): any {
    switch (priority) {
      case 'urgent':
        return {
          quotedMessageId: null, // Pas de citation pour urgence
          linkPreview: false
        };
      case 'high':
        return {
          linkPreview: true
        };
      default:
        return {
          linkPreview: true
        };
    }
  }

  /**
   * 🔍 VÉRIFIER STATUT INSTANCE GREEN API
   */
  async getInstanceStatus(): Promise<{success: boolean, status: string, data?: any}> {
    try {
      const url = `${GREEN_API_BASE_URL}/getStateInstance/${this.token}`;
      
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();

      return {
        success: response.ok,
        status: data.stateInstance || 'unknown',
        data
      };

    } catch (error) {
      return {
        success: false,
        status: 'error',
        data: { error: error.message }
      };
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
    const notificationService = new GreenAPINotificationService();
    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get('action');

    if (method === 'POST' && action === 'send') {
      // 📨 ENVOYER NOTIFICATION GÉNÉRIQUE
      const body: NotificationRequest = await req.json();
      const result = await notificationService.sendNotification(body);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST' && action === 'payment') {
      // 💳 NOTIFICATION PAIEMENT SPÉCIALISÉE
      const body = await req.json();
      const { to, paymentData, type } = body;
      
      const result = await notificationService.sendPaymentNotification(to, paymentData, type);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST' && action === 'text') {
      // 🔔 NOTIFICATION TEXTE SIMPLE
      const body = await req.json();
      const { to, message, priority } = body;
      
      const result = await notificationService.sendTextNotification(to, message, priority);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST' && action === 'error') {
      // 🚨 NOTIFICATION D'ERREUR
      const body = await req.json();
      const { to, errorMessage, context } = body;
      
      const result = await notificationService.sendErrorNotification(to, errorMessage, context);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && action === 'status') {
      // 🔍 STATUT INSTANCE GREEN API
      const result = await notificationService.getInstanceStatus();

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Action non supportée',
        usage: {
          send: 'POST /?action=send (notification générique)',
          payment: 'POST /?action=payment (notification paiement)',
          text: 'POST /?action=text (message simple)',
          error: 'POST /?action=error (notification erreur)',
          status: 'GET /?action=status (statut Green API)'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ [NotificationService] Erreur globale:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Erreur interne du service de notification'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log('📨 [NotificationService] Service Green API démarré');
console.log(`🌐 [NotificationService] Instance: ${GREEN_API_INSTANCE_ID}`);