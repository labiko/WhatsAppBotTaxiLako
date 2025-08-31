// ═══════════════════════════════════════════════════════════════
// 📨 SERVICE VÉRIFICATION ET NOTIFICATION PAIEMENTS CONFIRMÉS
// ═══════════════════════════════════════════════════════════════
// Ce service vérifie les paiements SUCCESS non notifiés et envoie
// automatiquement les notifications de confirmation aux clients

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentToNotify {
  payment_id: string;
  amount: number;
  reservation_id: string;
  client_phone?: string;
  reservations?: {
    client_phone: string;
    vehicle_type: string;
    destination_nom: string;
    depart_nom: string;
    prix_total: number;
  };
}

interface NotificationResult {
  checked: number;
  notified: number;
  failed: number;
  details: string[];
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const result: NotificationResult = {
      checked: 0,
      notified: 0,
      failed: 0,
      details: [],
      timestamp: new Date().toISOString()
    };

    console.log('🔄 [CHECKER] Début vérification paiements non notifiés');

    // 1. RÉCUPÉRER LES PAIEMENTS SUCCESS NON NOTIFIÉS
    const { data: payments, error: fetchError } = await supabase
      .from('lengopay_payments')
      .select(`
        payment_id,
        amount,
        reservation_id,
        client_phone,
        reservations(
          client_phone,
          vehicle_type,
          destination_nom,
          depart_nom,
          prix_total
        )
      `)
      .eq('status', 'SUCCESS')
      .is('processed_client_notified_at', null)
      .not('reservation_id', 'is', null)
      .limit(10); // Limiter à 10 par exécution

    if (fetchError) {
      console.error('❌ [CHECKER] Erreur récupération:', fetchError);
      throw new Error(`Erreur récupération paiements: ${fetchError.message}`);
    }

    result.checked = payments?.length || 0;
    console.log(`📊 [CHECKER] ${result.checked} paiements à notifier`);

    if (!payments || payments.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucun paiement à notifier',
        ...result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 2. TRAITER CHAQUE PAIEMENT
    for (const payment of payments as PaymentToNotify[]) {
      try {
        console.log(`💳 [CHECKER] Traitement: ${payment.payment_id}`);

        // Récupérer les infos de la réservation
        const reservation = payment.reservations;
        
        // Déterminer le numéro de téléphone
        const clientPhone = (reservation?.client_phone || payment.client_phone);
        if (!clientPhone) {
          result.failed++;
          result.details.push(`❌ ${payment.payment_id}: Téléphone client manquant`);
          continue;
        }

        // 3. PRÉPARER LE MESSAGE DE CONFIRMATION
        let confirmationMessage;
        
        if (reservation) {
          // Paiement avec réservation liée
          confirmationMessage = `✅ **PAIEMENT CONFIRMÉ !**

🎉 Votre paiement de **${payment.amount.toLocaleString('fr-FR')} GNF** a été validé avec succès !

📍 **Course confirmée :**
• De : ${reservation.depart_nom || 'Votre position'}
• Vers : ${reservation.destination_nom || 'Destination'}
• Type : ${reservation.vehicle_type?.toUpperCase() || 'TAXI'}

💳 Référence : ${payment.payment_id.substring(0, 20)}...

👨‍✈️ Un conducteur va vous être assigné
📱 Vous recevrez ses coordonnées bientôt

Merci d'utiliser LokoTaxi ! 🙏`;
        } else {
          // Paiement sans réservation (paiement direct)
          confirmationMessage = `✅ **PAIEMENT CONFIRMÉ !**

🎉 Votre paiement de **${payment.amount.toLocaleString('fr-FR')} GNF** a été validé avec succès !

💳 Référence : ${payment.payment_id.substring(0, 20)}...

✨ Votre paiement a été traité avec succès
📞 Contactez-nous pour toute question

Merci d'utiliser LokoTaxi ! 🙏`;
        }

        // 4. ENVOYER LA NOTIFICATION VIA NOTIFICATION-SERVICE
        const notificationUrl = `${SUPABASE_URL}/functions/v1/notification-service?action=send`;
        
        const notificationPayload = {
          to: clientPhone.replace('whatsapp:', ''),
          message: confirmationMessage,
          type: 'confirmation',
          priority: 'high',
          metadata: {
            payment_id: payment.payment_id,
            reservation_id: payment.reservation_id,
            amount: payment.amount
          }
        };

        console.log(`📨 [CHECKER] Envoi notification pour ${clientPhone}`);

        const notificationResponse = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify(notificationPayload)
        });

        const notificationResult = await notificationResponse.json();

        if (notificationResponse.ok && notificationResult.success) {
          // 5. MARQUER COMME NOTIFIÉ
          const { error: updateError } = await supabase
            .from('lengopay_payments')
            .update({ 
              processed_client_notified_at: new Date().toISOString()
            })
            .eq('payment_id', payment.payment_id);

          if (updateError) {
            console.error(`❌ [CHECKER] Erreur mise à jour: ${updateError.message}`);
            result.failed++;
            result.details.push(`⚠️ ${payment.payment_id}: Notifié mais non marqué`);
          } else {
            result.notified++;
            result.details.push(`✅ ${payment.payment_id}: Notification envoyée`);
            console.log(`✅ [CHECKER] ${payment.payment_id} notifié et marqué`);
          }
        } else {
          result.failed++;
          result.details.push(`❌ ${payment.payment_id}: Échec envoi notification`);
          console.error(`❌ [CHECKER] Échec notification: ${JSON.stringify(notificationResult)}`);
        }

      } catch (error) {
        result.failed++;
        result.details.push(`❌ ${payment.payment_id}: ${error.message}`);
        console.error(`❌ [CHECKER] Erreur traitement ${payment.payment_id}:`, error);
      }
    }

    console.log(`🎯 [CHECKER] Terminé: ${result.notified}/${result.checked} notifiés`);

    // 6. RETOURNER LE RÉSULTAT
    return new Response(JSON.stringify({
      success: true,
      message: `Vérification terminée: ${result.notified} notifications envoyées`,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ [CHECKER] Erreur globale:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Erreur lors de la vérification des paiements'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

console.log('🚀 [CHECKER] Service payment-notification-checker démarré');