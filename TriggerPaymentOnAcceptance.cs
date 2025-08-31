using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;
using Newtonsoft.Json;

/// <summary>
/// 💳 DÉCLENCHEMENT PAIEMENT SUR ACCEPTATION CONDUCTEUR
/// 
/// Cette fonction se déclenche quand un conducteur accepte une réservation
/// et crée automatiquement un paiement LengoPay pour le client.
/// 
/// ENDPOINT: /api/TriggerPaymentOnAcceptance
/// USAGE: Appelé automatiquement depuis l'app conducteur ou notification système
/// </summary>
public class TriggerPaymentOnAcceptanceController : Controller
{
    private const string SUPABASE_URL = "https://nmwnibzgvwltipmtwhzo.supabase.co";
    private const string SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndssdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTU5NzE1NCwiZXhwIjoyMDM1MTczMTU0fQ.4lmzOZ_J_lTmIUcJqn4pUE5Y_z0x1zGSJgQI1Bp6mxs";
    
    // URLs des services
    private const string PAYMENT_SERVICE_URL = "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/payment-service";
    
    /// <summary>
    /// 🎯 ENDPOINT PRINCIPAL - DÉCLENCHER PAIEMENT
    /// </summary>
    /// <param name="reservationId">ID de la réservation acceptée</param>
    /// <param name="conducteurId">ID du conducteur qui a accepté</param>
    /// <returns>Résultat de la création du paiement</returns>
    [HttpPost]
    public async Task<JsonResult> TriggerPaymentOnAcceptance(string reservationId, string conducteurId = null)
    {
        var logMessages = new List<string>();
        var startTime = DateTime.Now;
        
        try
        {
            logMessages.Add($"🚀 [PAYMENT-TRIGGER] Début pour réservation: {reservationId}");
            
            if (string.IsNullOrEmpty(reservationId))
            {
                return Json(new
                {
                    success = false,
                    error = "ReservationId requis",
                    logs = logMessages
                }, JsonRequestBehavior.AllowGet);
            }
            
            using (var httpClient = new HttpClient())
            {
                // 1. RÉCUPÉRER DONNÉES RÉSERVATION
                var reservationData = await GetReservationData(httpClient, reservationId, logMessages);
                if (reservationData == null)
                {
                    return Json(new
                    {
                        success = false,
                        error = "Réservation introuvable",
                        logs = logMessages
                    }, JsonRequestBehavior.AllowGet);
                }
                
                // 2. CRÉER PAIEMENT LENGOPAY
                var paymentResult = await CreatePaymentForReservation(httpClient, reservationData, logMessages);
                
                // 3. ENVOYER NOTIFICATION AVEC LIEN DE PAIEMENT
                bool notificationSent = false;
                if (paymentResult.success && !string.IsNullOrEmpty(paymentResult.paymentUrl))
                {
                    notificationSent = await SendPaymentNotification(httpClient, reservationData, paymentResult, logMessages);
                }
                
                var duration = (DateTime.Now - startTime).TotalSeconds;
                
                return Json(new
                {
                    success = paymentResult.success,
                    message = paymentResult.success ? "Paiement créé et notification envoyée" : paymentResult.message,
                    paymentId = paymentResult.paymentId,
                    paymentUrl = paymentResult.paymentUrl,
                    notificationSent = notificationSent,
                    reservationId = reservationId,
                    logs = logMessages,
                    duration = duration
                }, JsonRequestBehavior.AllowGet);
            }
        }
        catch (Exception ex)
        {
            var duration = (DateTime.Now - startTime).TotalSeconds;
            logMessages.Add($"❌ [PAYMENT-TRIGGER] Erreur globale: {ex.Message}");
            
            return Json(new
            {
                success = false,
                error = ex.Message,
                logs = logMessages,
                duration = duration
            }, JsonRequestBehavior.AllowGet);
        }
    }
    
    /// <summary>
    /// 📋 RÉCUPÉRER DONNÉES RÉSERVATION
    /// </summary>
    private async Task<ReservationData> GetReservationData(HttpClient httpClient, string reservationId, List<string> logMessages)
    {
        try
        {
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Add("apikey", SUPABASE_KEY);
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {SUPABASE_KEY}");
            
            // Récupérer réservation avec toutes les infos nécessaires
            var url = $"{SUPABASE_URL}/rest/v1/reservations?" +
                     $"id=eq.{reservationId}&" +
                     $"select=id,client_phone,prix_estime,vehicle_type,destination_nom,depart_nom,statut";
            
            logMessages.Add($"🔍 [RESERVATION] URL: {url.Replace(SUPABASE_KEY, "***")}");
            
            var response = await httpClient.GetStringAsync(url);
            logMessages.Add($"🔍 [RESERVATION] Réponse: {response.Substring(0, Math.Min(200, response.Length))}");
            
            var reservations = JsonConvert.DeserializeObject<List<ReservationData>>(response);
            
            if (reservations != null && reservations.Count > 0)
            {
                var reservation = reservations[0];
                logMessages.Add($"✅ [RESERVATION] Trouvée: {reservation.client_phone} - {reservation.prix_estime} GNF");
                return reservation;
            }
            
            return null;
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [RESERVATION] Erreur récupération: {ex.Message}");
            return null;
        }
    }
    
    /// <summary>
    /// 💳 CRÉER PAIEMENT POUR RÉSERVATION
    /// </summary>
    private async Task<PaymentResult> CreatePaymentForReservation(HttpClient httpClient, ReservationData reservation, List<string> logMessages)
    {
        try
        {
            logMessages.Add($"💳 [PAYMENT] Création paiement pour {reservation.client_phone} - {reservation.prix_estime} GNF");
            
            // Préparer données pour payment-service
            var paymentPayload = new
            {
                amount = reservation.prix_estime ?? 10000, // Fallback si prix manquant
                clientPhone = reservation.client_phone?.Replace("whatsapp:", ""),
                reservationId = reservation.id
            };
            
            var payloadJson = JsonConvert.SerializeObject(paymentPayload);
            logMessages.Add($"💳 [PAYMENT] Payload: {payloadJson}");
            
            // Appel au payment-service
            var paymentRequest = new HttpRequestMessage(HttpMethod.Post, $"{PAYMENT_SERVICE_URL}?action=create");
            paymentRequest.Headers.Add("Authorization", $"Bearer {SUPABASE_KEY}");
            paymentRequest.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
            
            var paymentResponse = await httpClient.SendAsync(paymentRequest);
            var paymentContent = await paymentResponse.Content.ReadAsStringAsync();
            
            logMessages.Add($"💳 [PAYMENT] Status: {paymentResponse.StatusCode}");
            logMessages.Add($"💳 [PAYMENT] Réponse: {paymentContent}");
            
            if (paymentResponse.IsSuccessStatusCode)
            {
                var paymentData = JsonConvert.DeserializeObject<dynamic>(paymentContent);
                
                return new PaymentResult
                {
                    success = true,
                    message = "Paiement créé avec succès",
                    paymentId = paymentData?.paymentId?.ToString(),
                    paymentUrl = paymentData?.paymentUrl?.ToString()
                };
            }
            else
            {
                return new PaymentResult
                {
                    success = false,
                    message = $"Échec création paiement: HTTP {paymentResponse.StatusCode}",
                    error = paymentContent
                };
            }
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [PAYMENT] Erreur création: {ex.Message}");
            return new PaymentResult
            {
                success = false,
                message = "Erreur technique lors de la création du paiement",
                error = ex.Message
            };
        }
    }
    
    /// <summary>
    /// 📱 ENVOYER NOTIFICATION DE PAIEMENT AU CLIENT
    /// </summary>
    private async Task<bool> SendPaymentNotification(HttpClient httpClient, ReservationData reservation, PaymentResult paymentResult, List<string> logMessages)
    {
        try
        {
            logMessages.Add($"📱 [NOTIFICATION] Envoi lien de paiement pour {reservation.client_phone}");
            
            // URL du notification-service
            const string NOTIFICATION_SERVICE_URL = "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/notification-service";
            
            // Préparer données pour notification-service
            var notificationPayload = new
            {
                clientPhone = reservation.client_phone?.Replace("whatsapp:", ""),
                amount = reservation.prix_estime ?? 0,
                paymentUrl = paymentResult.paymentUrl,
                reservationDetails = new
                {
                    vehicleType = reservation.vehicle_type,
                    destination = reservation.destination_nom,
                    depart = reservation.depart_nom,
                    prix = reservation.prix_estime?.ToString("N0") + " GNF"
                }
            };
            
            var payloadJson = JsonConvert.SerializeObject(notificationPayload);
            logMessages.Add($"📱 [NOTIFICATION] Payload: {payloadJson}");
            
            // Appel au notification-service
            var notificationRequest = new HttpRequestMessage(HttpMethod.Post, $"{NOTIFICATION_SERVICE_URL}?action=payment_request");
            notificationRequest.Headers.Add("Authorization", $"Bearer {SUPABASE_KEY}");
            notificationRequest.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
            
            var notificationResponse = await httpClient.SendAsync(notificationRequest);
            var notificationContent = await notificationResponse.Content.ReadAsStringAsync();
            
            logMessages.Add($"📱 [NOTIFICATION] Status: {notificationResponse.StatusCode}");
            logMessages.Add($"📱 [NOTIFICATION] Réponse: {notificationContent}");
            
            if (notificationResponse.IsSuccessStatusCode)
            {
                var notificationData = JsonConvert.DeserializeObject<dynamic>(notificationContent);
                bool success = notificationData?.success == true;
                logMessages.Add($"📱 [NOTIFICATION] Résultat: {(success ? "✅ Envoyé" : "❌ Échec")}");
                return success;
            }
            else
            {
                logMessages.Add($"❌ [NOTIFICATION] Échec HTTP: {notificationResponse.StatusCode}");
                return false;
            }
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [NOTIFICATION] Erreur: {ex.Message}");
            return false;
        }
    }
    
    #region Models
    
    public class ReservationData
    {
        public string id { get; set; }
        public string client_phone { get; set; }
        public decimal? prix_estime { get; set; }
        public string vehicle_type { get; set; }
        public string destination_nom { get; set; }
        public string depart_nom { get; set; }
        public string statut { get; set; }
    }
    
    public class PaymentResult
    {
        public bool success { get; set; }
        public string message { get; set; }
        public string paymentId { get; set; }
        public string paymentUrl { get; set; }
        public string error { get; set; }
    }
    
    #endregion
}