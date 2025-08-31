// ═══════════════════════════════════════════════════════════════
// 💳 INTÉGRATION LENGOPAY - BOT V3 - ZÉRO RÉGRESSION
// ═══════════════════════════════════════════════════════════════

// 🌐 ENDPOINTS PRODUCTION RÉELS
const LENGOPAY_SERVER_URL = "https://www.labico.net";
const LENGOPAY_CREATE_ENDPOINT = `${LENGOPAY_SERVER_URL}/api/LengoPayCreateTest`;
const LENGOPAY_STATUS_ENDPOINT = `${LENGOPAY_SERVER_URL}/api/TestUpdatePayment`;
const LENGOPAY_CALLBACK_ENDPOINT = `${LENGOPAY_SERVER_URL}/api/LengoPayCallback`;

const PAYMENT_SERVICE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/payment-service';
const NOTIFICATION_SERVICE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/notification-service';

export interface PaymentIntegrationConfig {
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  timeoutMinutes?: number;
  fallbackToExistingWorkflow?: boolean;
}

export interface PaymentSessionData {
  paymentId?: string;
  paymentUrl?: string;
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentAmount?: number;
  paymentCreatedAt?: string;
  requiresPayment?: boolean;
}

/**
 * 🛡️ POINT D'ANCRAGE SÉCURISÉ - VÉRIFICATION PAIEMENT REQUIS
 * Cette fonction s'insère dans le workflow existant sans le modifier
 */
export async function shouldRequirePayment(
  session: any,
  amount: number,
  config: PaymentIntegrationConfig = { enabled: false }
): Promise<boolean> {
  try {
    // 🔒 SÉCURITÉ : Si désactivé, retourner false (workflow normal)
    if (!config.enabled) {
      console.log('💳 [Payment] Service désactivé - workflow normal');
      return false;
    }

    // 🔒 VÉRIFICATIONS BUSINESS
    if (!amount || amount <= 0) {
      console.log('💳 [Payment] Montant invalide - workflow normal');
      return false;
    }

    if (config.minAmount && amount < config.minAmount) {
      console.log(`💳 [Payment] Montant ${amount} < minimum ${config.minAmount} - workflow normal`);
      return false;
    }

    if (config.maxAmount && amount > config.maxAmount) {
      console.log(`💳 [Payment] Montant ${amount} > maximum ${config.maxAmount} - workflow normal`);
      return false;
    }

    // 🔒 VÉRIFICATION SESSION
    if (!session?.vehicleType || !session?.destination) {
      console.log('💳 [Payment] Session incomplète - workflow normal');
      return false;
    }

    console.log(`💳 [Payment] Paiement requis pour ${amount} GNF`);
    return true;

  } catch (error) {
    console.error('❌ [Payment] Erreur vérification paiement:', error);
    // En cas d'erreur, toujours retourner false pour préserver le workflow
    return false;
  }
}

/**
 * 💳 PROCESSUS PAIEMENT LENGOPAY - NON-BLOQUANT
 * Cette fonction gère tout le processus paiement en parallèle du workflow
 */
export async function handlePaymentProcess(
  clientPhone: string,
  amount: number,
  session: any,
  config: PaymentIntegrationConfig = { enabled: false }
): Promise<{success: boolean, paymentData?: PaymentSessionData, message?: string}> {
  try {
    console.log(`💳 [Payment] Début processus paiement: ${amount} GNF pour ${clientPhone}`);

    // 🔒 SÉCURITÉ : Vérification finale avant création
    if (!config.enabled) {
      return {
        success: false,
        message: 'Service de paiement désactivé'
      };
    }

    // 🌐 APPEL SERVICE LENGOPAY
    const paymentResponse = await fetch(`${PAYMENT_SERVICE_URL}?action=create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
      },
      body: JSON.stringify({
        amount: amount,
        clientPhone: clientPhone,
        reservationId: session?.reservationId,
        sessionData: {
          vehicleType: session?.vehicleType,
          destination: session?.destination,
          clientPosition: session?.clientPosition
        }
      })
    });

    if (!paymentResponse.ok) {
      throw new Error(`HTTP ${paymentResponse.status}: ${paymentResponse.statusText}`);
    }

    const paymentResult = await paymentResponse.json();
    console.log('💳 [Payment] Réponse service:', paymentResult);

    if (paymentResult.success && paymentResult.paymentUrl) {
      const paymentData: PaymentSessionData = {
        paymentId: paymentResult.paymentId,
        paymentUrl: paymentResult.paymentUrl,
        paymentStatus: 'PENDING',
        paymentAmount: amount,
        paymentCreatedAt: new Date().toISOString(),
        requiresPayment: true
      };

      console.log(`✅ [Payment] Paiement créé avec succès: ${paymentResult.paymentId}`);
      
      return {
        success: true,
        paymentData,
        message: 'Paiement créé avec succès'
      };

    } else {
      return {
        success: false,
        message: paymentResult.message || 'Erreur création paiement'
      };
    }

  } catch (error) {
    console.error('❌ [Payment] Erreur processus paiement:', error);
    return {
      success: false,
      message: `Erreur technique: ${error.message}`
    };
  }
}

/**
 * 📨 NOTIFICATION PAIEMENT VIA GREEN API
 * Utilise le service dédié pour l'envoi de notifications
 */
export async function sendPaymentNotification(
  clientPhone: string,
  paymentData: PaymentSessionData,
  type: 'request' | 'success' | 'failed' | 'expired' | 'pending',
  additionalData: any = {}
): Promise<{success: boolean, messageId?: string, message?: string}> {
  try {
    console.log(`📨 [Notification] Envoi ${type} vers ${clientPhone}`);

    const notificationPayload = {
      to: clientPhone,
      paymentData: {
        ...paymentData,
        ...additionalData
      },
      type: type
    };

    const notificationResponse = await fetch(`${NOTIFICATION_SERVICE_URL}?action=payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
      },
      body: JSON.stringify(notificationPayload)
    });

    if (!notificationResponse.ok) {
      throw new Error(`HTTP ${notificationResponse.status}: ${notificationResponse.statusText}`);
    }

    const notificationResult = await notificationResponse.json();
    console.log('📨 [Notification] Réponse:', notificationResult);

    return {
      success: notificationResult.success,
      messageId: notificationResult.messageId,
      message: notificationResult.message
    };

  } catch (error) {
    console.error('❌ [Notification] Erreur envoi:', error);
    return {
      success: false,
      message: `Erreur envoi notification: ${error.message}`
    };
  }
}

/**
 * 🔍 VÉRIFICATION STATUT PAIEMENT
 * Vérifie le statut du paiement de manière non-bloquante
 */
export async function checkPaymentStatus(
  paymentId: string
): Promise<{success: boolean, status?: string, data?: any}> {
  try {
    console.log(`🔍 [Payment] Vérification statut: ${paymentId}`);

    const statusResponse = await fetch(
      `${PAYMENT_SERVICE_URL}?action=status&paymentId=${paymentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('🔍 [Payment] Statut:', statusResult);

    return {
      success: statusResult.success,
      status: statusResult.status,
      data: statusResult.paymentData
    };

  } catch (error) {
    console.error('❌ [Payment] Erreur vérification statut:', error);
    return {
      success: false,
      status: 'UNKNOWN'
    };
  }
}

/**
 * ⏰ VÉRIFICATION TIMEOUT PAIEMENT
 */
export async function isPaymentExpired(
  paymentId: string,
  timeoutMinutes: number = 15
): Promise<boolean> {
  try {
    const expiredResponse = await fetch(
      `${PAYMENT_SERVICE_URL}?action=expired&paymentId=${paymentId}&timeout=${timeoutMinutes}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
        }
      }
    );

    if (!expiredResponse.ok) {
      return false; // En cas d'erreur, considérer comme non expiré
    }

    const expiredResult = await expiredResponse.json();
    return expiredResult.expired || false;

  } catch (error) {
    console.error('❌ [Payment] Erreur vérification timeout:', error);
    return false;
  }
}

/**
 * 🛡️ POINT D'ANCRAGE PRINCIPAL - INTÉGRATION DANS WORKFLOW V3
 * Cette fonction s'insère dans le workflow existant à un point précis
 */
export async function integratePaymentInWorkflow(
  session: any,
  clientPhone: string,
  amount: number,
  config: PaymentIntegrationConfig
): Promise<{
  continueWorkflow: boolean,
  paymentRequired: boolean,
  paymentData?: PaymentSessionData,
  response?: any
}> {
  try {
    console.log('🔄 [Integration] Évaluation besoin paiement...');

    // 🛡️ ÉTAPE 1: Vérification si paiement requis (non-bloquant)
    const requiresPayment = await shouldRequirePayment(session, amount, config);
    
    if (!requiresPayment) {
      // Continuer le workflow normal sans modification
      return {
        continueWorkflow: true,
        paymentRequired: false
      };
    }

    // 🛡️ ÉTAPE 2: Traitement paiement (si requis)
    console.log('💳 [Integration] Paiement requis - création...');
    
    const paymentResult = await handlePaymentProcess(clientPhone, amount, session, config);
    
    if (!paymentResult.success) {
      console.error('❌ [Integration] Échec création paiement:', paymentResult.message);
      
      // En cas d'échec paiement, continuer workflow normal si configuré
      if (config.fallbackToExistingWorkflow) {
        return {
          continueWorkflow: true,
          paymentRequired: false
        };
      }
      
      // Sinon, envoyer notification d'erreur
      await sendPaymentNotification(
        clientPhone,
        {} as PaymentSessionData,
        'failed',
        { errorMessage: paymentResult.message }
      );
      
      return {
        continueWorkflow: false,
        paymentRequired: true,
        response: {
          success: false,
          message: 'Erreur lors de la création du paiement'
        }
      };
    }

    // 🛡️ ÉTAPE 3: Envoi notification paiement
    console.log('📨 [Integration] Envoi URL paiement au client...');
    
    const notificationResult = await sendPaymentNotification(
      clientPhone,
      paymentResult.paymentData!,
      'request',
      {
        vehicleType: session.vehicleType,
        destination: session.destination
      }
    );

    if (!notificationResult.success) {
      console.error('❌ [Integration] Échec envoi notification:', notificationResult.message);
    }

    // 🛡️ ÉTAPE 4: Arrêt workflow en attente paiement
    return {
      continueWorkflow: false,
      paymentRequired: true,
      paymentData: paymentResult.paymentData,
      response: {
        success: true,
        message: 'URL de paiement envoyée - En attente paiement'
      }
    };

  } catch (error) {
    console.error('❌ [Integration] Erreur intégration paiement:', error);
    
    // En cas d'erreur, toujours permettre la continuation du workflow
    return {
      continueWorkflow: true,
      paymentRequired: false
    };
  }
}

/**
 * 🔄 GESTION ÉTATS PAIEMENT DANS SESSION
 * Met à jour la session avec les données paiement
 */
export function updateSessionWithPayment(
  session: any,
  paymentData: PaymentSessionData
): any {
  return {
    ...session,
    // Préserver tous les états existants
    etat: session.etat,
    vehicleType: session.vehicleType,
    destination: session.destination,
    clientPosition: session.clientPosition,
    
    // Ajouter données paiement
    paymentId: paymentData.paymentId,
    paymentUrl: paymentData.paymentUrl,
    paymentStatus: paymentData.paymentStatus,
    paymentAmount: paymentData.paymentAmount,
    paymentCreatedAt: paymentData.paymentCreatedAt,
    requiresPayment: paymentData.requiresPayment
  };
}