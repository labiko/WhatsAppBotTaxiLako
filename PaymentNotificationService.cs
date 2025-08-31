using System;
using System.Collections.Generic;
using System.Net;
using System.Text;
using System.Web;
using Newtonsoft.Json;

/// <summary>
/// 💳 SERVICE NOTIFICATION PAIEMENT - EXÉCUTION CHAQUE MINUTE
/// 
/// Ce service vérifie les paiements en attente et notifie les clients via WhatsApp
/// jusqu'à ce qu'ils effectuent le paiement ou que le timeout soit atteint.
/// 
/// PLANIFICATION: Toutes les minutes via Windows Task Scheduler
/// ENDPOINT: /api/ProcessPaymentNotifications
/// </summary>
public class PaymentNotificationService : IHttpHandler
{
    private const string SUPABASE_URL = "https://nmwnibzgvwltipmtwhzo.supabase.co";
    private const string SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndssdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTU5NzE1NCwiZXhwIjoyMDM1MTczMTU0fQ.4lmzOZ_J_lTmIUcJqn4pUE5Y_z0x1zGSJgQI1Bp6mxs";
    
    // Configuration Green API
    private const string GREEN_API_URL = "https://7105303512.green-api.com/waInstance7105303512/sendMessage/f7a6c8d15bc84b27bada6d5e8cc2a7f1976f62e969c14bb688";
    
    // Configuration paiement
    private const int PAYMENT_TIMEOUT_MINUTES = 15; // Timeout paiement en minutes
    private const int NOTIFICATION_INTERVAL_MINUTES = 1; // Fréquence notifications
    
    public bool IsReusable => false;
    
    public void ProcessRequest(HttpContext context)
    {
        try
        {
            var logMessages = new List<string>();
            logMessages.Add($"🚀 [PAYMENT-NOTIFICATION] Début traitement: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            
            int processedCount = ProcessPendingPayments(logMessages);
            
            logMessages.Add($"✅ [PAYMENT-NOTIFICATION] Fin traitement - {processedCount} notifications envoyées");
            
            // Réponse HTTP
            context.Response.ContentType = "application/json";
            context.Response.Write(JsonConvert.SerializeObject(new
            {
                success = true,
                message = $"Traitement terminé - {processedCount} notifications",
                timestamp = DateTime.Now,
                logs = logMessages
            }));
        }
        catch (Exception ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 500;
            context.Response.Write(JsonConvert.SerializeObject(new
            {
                success = false,
                error = ex.Message,
                timestamp = DateTime.Now
            }));
        }
    }
    
    /// <summary>
    /// 🔍 TRAITER LES PAIEMENTS EN ATTENTE
    /// </summary>
    private int ProcessPendingPayments(List<string> logMessages)
    {
        int notificationsEnvoyees = 0;
        
        try
        {
            using (var client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                client.Headers["apikey"] = SUPABASE_KEY;
                client.Headers["Authorization"] = $"Bearer {SUPABASE_KEY}";
                client.Headers["Content-Type"] = "application/json";
                
                // 1. RÉCUPÉRER PAIEMENTS EN ATTENTE
                var pendingPayments = GetPendingPayments(client, logMessages);
                logMessages.Add($"📊 [PAYMENT] {pendingPayments.Count} paiements en attente trouvés");
                
                foreach (var payment in pendingPayments)
                {
                    try
                    {
                        logMessages.Add($"💳 [PAYMENT] Traitement paiement: {payment.payment_id} - Client: {payment.client_phone}");
                        
                        // 2. VÉRIFIER TIMEOUT
                        if (IsPaymentExpired(payment, logMessages))
                        {
                            // Marquer comme expiré et passer au suivant
                            MarkPaymentAsExpired(client, payment.payment_id, logMessages);
                            continue;
                        }
                        
                        // 3. VÉRIFIER SI NOTIFICATION RÉCENTE
                        if (ShouldSendNotification(payment, logMessages))
                        {
                            // 4. RÉCUPÉRER INFOS RÉSERVATION
                            var reservationInfo = GetReservationInfo(client, payment.client_phone, logMessages);
                            if (reservationInfo == null)
                            {
                                logMessages.Add($"⚠️ [PAYMENT] Aucune réservation trouvée pour {payment.client_phone}");
                                continue;
                            }
                            
                            // 5. ENVOYER NOTIFICATION WHATSAPP
                            bool notificationSent = SendPaymentNotification(payment, reservationInfo, logMessages);
                            if (notificationSent)
                            {
                                // 6. METTRE À JOUR DERNIÈRE NOTIFICATION
                                UpdateLastNotificationTime(client, payment.payment_id, logMessages);
                                notificationsEnvoyees++;
                            }
                        }
                        else
                        {
                            logMessages.Add($"⏭️ [PAYMENT] Notification récente - skip {payment.payment_id}");
                        }
                    }
                    catch (Exception ex)
                    {
                        logMessages.Add($"❌ [PAYMENT] Erreur traitement {payment.payment_id}: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [PAYMENT-GLOBAL] Erreur: {ex.Message}");
        }
        
        return notificationsEnvoyees;
    }
    
    /// <summary>
    /// 📋 RÉCUPÉRER PAIEMENTS EN ATTENTE
    /// </summary>
    private List<PaymentInfo> GetPendingPayments(WebClient client, List<string> logMessages)
    {
        try
        {
            // Récupérer paiements PENDING créés dans les dernières 24h
            var url = $"{SUPABASE_URL}/rest/v1/lengopay_payments?" +
                     $"status=eq.PENDING&" +
                     $"created_at=gte.{DateTime.UtcNow.AddHours(-24):yyyy-MM-ddTHH:mm:ss}Z&" +
                     $"select=id,payment_id,client_phone,amount,created_at,last_notification_at&" +
                     $"order=created_at.asc";
            
            logMessages.Add($"🔍 [QUERY] URL: {url.Replace(SUPABASE_KEY, "***")}");
            
            var response = client.DownloadString(url);
            return JsonConvert.DeserializeObject<List<PaymentInfo>>(response) ?? new List<PaymentInfo>();
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [QUERY] Erreur récupération paiements: {ex.Message}");
            return new List<PaymentInfo>();
        }
    }
    
    /// <summary>
    /// ⏰ VÉRIFIER SI PAIEMENT EXPIRÉ
    /// </summary>
    private bool IsPaymentExpired(PaymentInfo payment, List<string> logMessages)
    {
        var createdAt = DateTime.Parse(payment.created_at);
        var elapsedMinutes = (DateTime.UtcNow - createdAt).TotalMinutes;
        
        bool expired = elapsedMinutes > PAYMENT_TIMEOUT_MINUTES;
        logMessages.Add($"⏰ [TIMEOUT] Paiement {payment.payment_id}: {elapsedMinutes:F1}min (limite: {PAYMENT_TIMEOUT_MINUTES}min) - {(expired ? "EXPIRÉ" : "OK")}");
        
        return expired;
    }
    
    /// <summary>
    /// 🔔 VÉRIFIER SI DOIT ENVOYER NOTIFICATION
    /// </summary>
    private bool ShouldSendNotification(PaymentInfo payment, List<string> logMessages)
    {
        // Si aucune notification envoyée, envoyer immédiatement
        if (string.IsNullOrEmpty(payment.last_notification_at))
        {
            logMessages.Add($"🔔 [NOTIFICATION] Première notification pour {payment.payment_id}");
            return true;
        }
        
        // Sinon vérifier intervalle
        var lastNotification = DateTime.Parse(payment.last_notification_at);
        var minutesSinceLastNotification = (DateTime.UtcNow - lastNotification).TotalMinutes;
        
        bool shouldSend = minutesSinceLastNotification >= NOTIFICATION_INTERVAL_MINUTES;
        logMessages.Add($"🔔 [NOTIFICATION] Dernière: {minutesSinceLastNotification:F1}min - {(shouldSend ? "ENVOYER" : "SKIP")}");
        
        return shouldSend;
    }
    
    /// <summary>
    /// 📋 RÉCUPÉRER INFOS RÉSERVATION
    /// </summary>
    private ReservationInfo GetReservationInfo(WebClient client, string clientPhone, List<string> logMessages)
    {
        try
        {
            var url = $"{SUPABASE_URL}/rest/v1/reservations?" +
                     $"client_phone=eq.{clientPhone}&" +
                     $"statut=in.(accepted,pending)&" +
                     $"select=id,vehicle_type,destination_nom,depart_nom,prix_estime&" +
                     $"order=created_at.desc&limit=1";
            
            var response = client.DownloadString(url);
            var reservations = JsonConvert.DeserializeObject<List<ReservationInfo>>(response);
            
            return reservations?.Count > 0 ? reservations[0] : null;
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [RESERVATION] Erreur: {ex.Message}");
            return null;
        }
    }
    
    /// <summary>
    /// 📱 ENVOYER NOTIFICATION WHATSAPP
    /// </summary>
    private bool SendPaymentNotification(PaymentInfo payment, ReservationInfo reservation, List<string> logMessages)
    {
        try
        {
            // Calculer temps restant
            var createdAt = DateTime.Parse(payment.created_at);
            var elapsedMinutes = (DateTime.UtcNow - createdAt).TotalMinutes;
            var remainingMinutes = Math.Max(0, PAYMENT_TIMEOUT_MINUTES - (int)elapsedMinutes);
            
            // Message de notification
            var message = $"💳 **PAIEMENT EN ATTENTE**\\n\\n" +
                         $"🚗 Réservation: {reservation.vehicle_type?.ToUpper()} {reservation.destination_nom}\\n" +
                         $"💰 Montant: {payment.amount:N0} GNF\\n" +
                         $"⏰ Temps restant: {remainingMinutes} min\\n\\n" +
                         $"🔗 Cliquez pour payer maintenant:\\n" +
                         $"https://sandbox.lengopay.com/portail/payment/{payment.payment_id}\\n\\n" +
                         $"⚠️ Paiement requis pour confirmer votre course !";
            
            // Payload Green API
            var payload = new
            {
                chatId = payment.client_phone.Replace("+", "") + "@c.us",
                message = message
            };
            
            logMessages.Add($"📱 [WHATSAPP] Envoi vers: {payment.client_phone}");
            logMessages.Add($"📱 [WHATSAPP] Message: {message.Substring(0, Math.Min(100, message.Length))}...");
            
            using (var greenClient = new WebClient())
            {
                greenClient.Headers["Content-Type"] = "application/json";
                var payloadJson = JsonConvert.SerializeObject(payload);
                
                var response = greenClient.UploadString(GREEN_API_URL, payloadJson);
                logMessages.Add($"📱 [WHATSAPP] Réponse: {response}");
                
                return true;
            }
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [WHATSAPP] Erreur envoi: {ex.Message}");
            return false;
        }
    }
    
    /// <summary>
    /// 🔄 METTRE À JOUR DERNIÈRE NOTIFICATION
    /// </summary>
    private void UpdateLastNotificationTime(WebClient client, string paymentId, List<string> logMessages)
    {
        try
        {
            var updateData = new { last_notification_at = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ") };
            var updateJson = JsonConvert.SerializeObject(updateData);
            
            var updateUrl = $"{SUPABASE_URL}/rest/v1/lengopay_payments?payment_id=eq.{paymentId}";
            client.Headers["Prefer"] = "return=minimal";
            
            client.UploadString(updateUrl, "PATCH", updateJson);
            logMessages.Add($"🔄 [UPDATE] Dernière notification mise à jour: {paymentId}");
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [UPDATE] Erreur: {ex.Message}");
        }
    }
    
    /// <summary>
    /// ⏰ MARQUER PAIEMENT COMME EXPIRÉ
    /// </summary>
    private void MarkPaymentAsExpired(WebClient client, string paymentId, List<string> logMessages)
    {
        try
        {
            var updateData = new { status = "EXPIRED" };
            var updateJson = JsonConvert.SerializeObject(updateData);
            
            var updateUrl = $"{SUPABASE_URL}/rest/v1/lengopay_payments?payment_id=eq.{paymentId}";
            client.Headers["Prefer"] = "return=minimal";
            
            client.UploadString(updateUrl, "PATCH", updateJson);
            logMessages.Add($"⏰ [EXPIRED] Paiement expiré: {paymentId}");
        }
        catch (Exception ex)
        {
            logMessages.Add($"❌ [EXPIRED] Erreur: {ex.Message}");
        }
    }
    
    #region Models
    
    public class PaymentInfo
    {
        public string id { get; set; }
        public string payment_id { get; set; }
        public string client_phone { get; set; }
        public decimal amount { get; set; }
        public string created_at { get; set; }
        public string last_notification_at { get; set; }
    }
    
    public class ReservationInfo
    {
        public string id { get; set; }
        public string vehicle_type { get; set; }
        public string destination_nom { get; set; }
        public string depart_nom { get; set; }
        public decimal? prix_estime { get; set; }
    }
    
    #endregion
}