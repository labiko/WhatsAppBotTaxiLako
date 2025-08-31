using System;
using System.Net;
using System.Web;
using Newtonsoft.Json;

/// <summary>
/// 📱 ENDPOINT SIMPLE - NOTIFICATION PAIEMENTS EN ATTENTE
/// 
/// Appelle directement le notification-service pour rappeler les paiements en attente.
/// Exécuté toutes les minutes via Windows Task Scheduler.
/// 
/// ENDPOINT: /api/NotifyPendingPayments
/// PLANIFICATION: curl -X GET http://localhost/api/NotifyPendingPayments
/// </summary>
public class NotifyPendingPayments : IHttpHandler
{
    // URL du service de notification existant
    private const string NOTIFICATION_SERVICE_URL = "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/notification-service";
    
    public bool IsReusable => false;
    
    public void ProcessRequest(HttpContext context)
    {
        try
        {
            // Appel direct au notification-service avec action=payment_reminders
            using (var client = new WebClient())
            {
                client.Encoding = System.Text.Encoding.UTF8;
                client.Headers["Content-Type"] = "application/json";
                
                // URL avec paramètre action
                var serviceUrl = $"{NOTIFICATION_SERVICE_URL}?action=payment_reminders";
                
                // Payload pour le service
                var payload = JsonConvert.SerializeObject(new
                {
                    action = "payment_reminders",
                    timestamp = DateTime.UtcNow
                });
                
                // Appel POST vers notification-service
                var response = client.UploadString(serviceUrl, "POST", payload);
                
                // Réponse success
                context.Response.ContentType = "application/json";
                context.Response.Write(JsonConvert.SerializeObject(new
                {
                    success = true,
                    message = "Appel notification-service réussi",
                    timestamp = DateTime.Now,
                    service_response = response
                }));
            }
        }
        catch (Exception ex)
        {
            // Réponse erreur
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 500;
            context.Response.Write(JsonConvert.SerializeObject(new
            {
                success = false,
                error = ex.Message,
                timestamp = DateTime.Now,
                endpoint = "NotifyPendingPayments"
            }));
        }
    }
}