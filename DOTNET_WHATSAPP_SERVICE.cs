// =======================================================
// SERVICE .NET CORE POUR TRAITEMENT NOTIFICATIONS WHATSAPP
// =======================================================
// À intégrer dans votre backend .NET Core
// =======================================================

using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// =======================================================
// 1. MODÈLES DE DONNÉES
// =======================================================

public class NotificationPending
{
    public Guid Id { get; set; }
    public Guid ReservationId { get; set; }
    public string Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class ReservationDetails
{
    public Guid Id { get; set; }
    public string ClientPhone { get; set; }
    public string Statut { get; set; }
    public Guid? ConducteurId { get; set; }
    public string DestinationNom { get; set; }
    public decimal? PrixTotal { get; set; }
    public decimal? DistanceKm { get; set; }
    public ConducteurDetails Conducteurs { get; set; }
}

public class ConducteurDetails
{
    public Guid Id { get; set; }
    public string Nom { get; set; }
    public string Prenom { get; set; }
    public string Telephone { get; set; }
    public string VehicleType { get; set; }
    public string VehicleMarque { get; set; }
    public string VehicleModele { get; set; }
    public string VehicleCouleur { get; set; }
    public string VehiclePlaque { get; set; }
    public decimal NoteMoyenne { get; set; }
}

public class TwilioMessage
{
    public string From { get; set; }
    public string To { get; set; }
    public string Body { get; set; }
}

// =======================================================
// 2. SERVICE PRINCIPAL WHATSAPP
// =======================================================

public interface IWhatsAppNotificationService
{
    Task<int> ProcessPendingNotificationsAsync();
    Task<bool> SendDriverInfoAsync(Guid reservationId);
    Task<bool> ProcessNotificationAsync(NotificationPending notification);
}

public class WhatsAppNotificationService : IWhatsAppNotificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WhatsAppNotificationService> _logger;
    private readonly IConfiguration _configuration;

    // Configuration depuis appsettings.json
    private readonly string _supabaseUrl;
    private readonly string _supabaseKey;
    private readonly string _twilioAccountSid;
    private readonly string _twilioAuthToken;
    private readonly string _twilioWhatsAppNumber;

    public WhatsAppNotificationService(
        IHttpClientFactory httpClientFactory,
        ILogger<WhatsAppNotificationService> logger,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;

        _supabaseUrl = configuration["Supabase:Url"];
        _supabaseKey = configuration["Supabase:ServiceKey"];
        _twilioAccountSid = configuration["Twilio:AccountSid"];
        _twilioAuthToken = configuration["Twilio:AuthToken"];
        _twilioWhatsAppNumber = configuration["Twilio:WhatsAppNumber"];
    }

    public async Task<int> ProcessPendingNotificationsAsync()
    {
        _logger.LogInformation("🔍 Vérification des notifications en attente...");

        try
        {
            // 1. Récupérer les notifications non traitées
            var notifications = await GetPendingNotificationsAsync();

            if (!notifications.Any())
            {
                _logger.LogInformation("✅ Aucune notification en attente");
                return 0;
            }

            _logger.LogInformation($"📋 {notifications.Count} notification(s) à traiter");

            // 2. Traiter chaque notification
            int processedCount = 0;
            foreach (var notification in notifications)
            {
                try
                {
                    _logger.LogInformation($"📤 Traitement notification: {notification.Id} (réservation: {notification.ReservationId})");

                    var success = await ProcessNotificationAsync(notification);
                    if (success)
                    {
                        await MarkNotificationAsProcessedAsync(notification.Id);
                        processedCount++;
                        _logger.LogInformation($"✅ Notification {notification.Id} traitée avec succès");
                    }
                    else
                    {
                        _logger.LogWarning($"❌ Échec traitement notification {notification.Id}");
                    }

                    // Délai entre notifications pour éviter le spam
                    await Task.Delay(2000);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"❌ Erreur traitement notification {notification.Id}");
                }
            }

            _logger.LogInformation($"📊 Résultat: {processedCount}/{notifications.Count} notifications traitées");
            return processedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Erreur lors du traitement des notifications");
            return 0;
        }
    }

    public async Task<bool> ProcessNotificationAsync(NotificationPending notification)
    {
        return await SendDriverInfoAsync(notification.ReservationId);
    }

    public async Task<bool> SendDriverInfoAsync(Guid reservationId)
    {
        try
        {
            // 1. Récupérer les données de la réservation
            var reservation = await GetReservationDetailsAsync(reservationId);
            if (reservation == null)
            {
                _logger.LogWarning($"⚠️ Réservation {reservationId} non trouvée");
                return false;
            }

            if (reservation.Conducteurs == null)
            {
                _logger.LogWarning($"⚠️ Conducteur non trouvé pour réservation {reservationId}");
                return false;
            }

            // 2. Construire le message WhatsApp
            var message = BuildDriverInfoMessage(reservation);

            // 3. Envoyer via Twilio
            var success = await SendTwilioWhatsAppAsync(reservation.ClientPhone, message);

            if (success)
            {
                _logger.LogInformation($"✅ WhatsApp envoyé à {reservation.ClientPhone}");
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Erreur envoi WhatsApp pour réservation {reservationId}");
            return false;
        }
    }

    private async Task<List<NotificationPending>> GetPendingNotificationsAsync()
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Add("apikey", _supabaseKey);
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

        var response = await httpClient.GetAsync($"{_supabaseUrl}/rest/v1/notifications_pending?processed_at=is.null&select=*&limit=10");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<NotificationPending>>(json, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        });
    }

    private async Task<ReservationDetails> GetReservationDetailsAsync(Guid reservationId)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Add("apikey", _supabaseKey);
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

        var response = await httpClient.GetAsync($"{_supabaseUrl}/rest/v1/reservations?id=eq.{reservationId}&statut=eq.accepted&select=*,conducteurs(*)");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var reservations = JsonSerializer.Deserialize<List<ReservationDetails>>(json, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        });

        return reservations?.FirstOrDefault();
    }

    private string BuildDriverInfoMessage(ReservationDetails reservation)
    {
        var conducteur = reservation.Conducteurs;
        var etaMinutes = Math.Max(5, (int)Math.Round((reservation.DistanceKm ?? 5) * 3));

        return $@"✅ CONDUCTEUR TROUVÉ!

🚖 Votre conducteur:
👤 {conducteur.Prenom} {conducteur.Nom}
📱 {conducteur.Telephone}
🚗 {conducteur.VehicleCouleur} {conducteur.VehicleMarque} {conducteur.VehicleModele}
🔢 Plaque: {conducteur.VehiclePlaque}
⏱️ Arrivée dans: {etaMinutes} minutes
⭐ Note: {conducteur.NoteMoyenne:F1}/5

💰 Prix confirmé: {reservation.PrixTotal?.ToString("N0") ?? "0"} GNF
📍 Destination: {reservation.DestinationNom}

Le conducteur vous contactera dans quelques instants.

Bon voyage! 🚗";
    }

    private async Task<bool> SendTwilioWhatsAppAsync(string clientPhone, string message)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            
            // Authentification Twilio (Basic Auth)
            var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_twilioAccountSid}:{_twilioAuthToken}"));
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");

            // Corps de la requête
            var formContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("From", $"whatsapp:{_twilioWhatsAppNumber}"),
                new KeyValuePair<string, string>("To", $"whatsapp:{clientPhone}"),
                new KeyValuePair<string, string>("Body", message)
            });

            var response = await httpClient.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{_twilioAccountSid}/Messages.json", formContent);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"❌ Erreur Twilio: {response.StatusCode} - {errorContent}");
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Exception lors de l'envoi Twilio");
            return false;
        }
    }

    private async Task MarkNotificationAsProcessedAsync(Guid notificationId)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Add("apikey", _supabaseKey);
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
        httpClient.DefaultRequestHeaders.Add("Prefer", "return=minimal");

        var updateData = new { processed_at = DateTime.UtcNow };
        var json = JsonSerializer.Serialize(updateData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        await httpClient.PatchAsync($"{_supabaseUrl}/rest/v1/notifications_pending?id=eq.{notificationId}", content);
    }
}

// =======================================================
// 3. SERVICE EN ARRIÈRE-PLAN (HOSTED SERVICE)
// =======================================================

public class WhatsAppBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WhatsAppBackgroundService> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30); // 30 secondes

    public WhatsAppBackgroundService(IServiceProvider serviceProvider, ILogger<WhatsAppBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 Service WhatsApp démarré - polling toutes les {Interval} secondes", _pollingInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppNotificationService>();

                var processedCount = await whatsAppService.ProcessPendingNotificationsAsync();
                
                if (processedCount > 0)
                {
                    _logger.LogInformation($"📊 {processedCount} notification(s) WhatsApp traitée(s)");
                }

                await Task.Delay(_pollingInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur dans le service en arrière-plan WhatsApp");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); // Attendre 1 minute en cas d'erreur
            }
        }
    }
}

// =======================================================
// 4. CONTRÔLEUR API (OPTIONNEL)
// =======================================================

[ApiController]
[Route("api/[controller]")]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppNotificationService _whatsAppService;
    private readonly ILogger<WhatsAppController> _logger;

    public WhatsAppController(IWhatsAppNotificationService whatsAppService, ILogger<WhatsAppController> logger)
    {
        _whatsAppService = whatsAppService;
        _logger = logger;
    }

    [HttpPost("process-notifications")]
    public async Task<IActionResult> ProcessNotifications()
    {
        try
        {
            var processedCount = await _whatsAppService.ProcessPendingNotificationsAsync();
            return Ok(new { success = true, processed = processedCount, message = $"{processedCount} notification(s) traitée(s)" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors du traitement des notifications");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("send-driver-info/{reservationId}")]
    public async Task<IActionResult> SendDriverInfo(Guid reservationId)
    {
        try
        {
            var success = await _whatsAppService.SendDriverInfoAsync(reservationId);
            if (success)
            {
                return Ok(new { success = true, message = "WhatsApp envoyé avec succès" });
            }
            else
            {
                return BadRequest(new { success = false, message = "Échec de l'envoi WhatsApp" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de l'envoi WhatsApp");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}

// =======================================================
// 5. ENREGISTREMENT DES SERVICES (Program.cs ou Startup.cs)
// =======================================================

/*
// Dans Program.cs ou Startup.cs :

builder.Services.AddHttpClient();
builder.Services.AddScoped<IWhatsAppNotificationService, WhatsAppNotificationService>();
builder.Services.AddHostedService<WhatsAppBackgroundService>();

// Configuration dans appsettings.json :
{
  "Supabase": {
    "Url": "https://nmwnibzgvwltipmtwhzo.supabase.co",
    "ServiceKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M"
  },
  "Twilio": {
    "AccountSid": "AC18f32de0b3353a2e66ca647797e0993d",
    "AuthToken": "a85040196f279e0acd690566fe2ae788",
    "WhatsAppNumber": "+14155238886"
  }
}
*/