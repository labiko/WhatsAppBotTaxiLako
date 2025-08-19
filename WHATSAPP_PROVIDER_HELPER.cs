using System;
using System.Collections.Generic;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class WhatsAppProviderHelper
{
    private readonly string _provider;
    private readonly string _twilioSid;
    private readonly string _twilioToken;
    private readonly string _twilioNumber;
    private readonly string _greenApiInstanceId;
    private readonly string _greenApiToken;
    private readonly string _greenApiBaseUrl;

    public WhatsAppProviderHelper()
    {
        // Lire la configuration
        _provider = ConfigurationManager.AppSettings["WhatsApp:Provider"] ?? "twilio";
        
        // Config Twilio
        _twilioSid = ConfigurationManager.AppSettings["Twilio:Sid"];
        _twilioToken = ConfigurationManager.AppSettings["Twilio:Token"];
        _twilioNumber = ConfigurationManager.AppSettings["Twilio:Number"];
        
        // Config Green API
        _greenApiInstanceId = ConfigurationManager.AppSettings["GreenAPI:InstanceId"];
        _greenApiToken = ConfigurationManager.AppSettings["GreenAPI:Token"];
        _greenApiBaseUrl = ConfigurationManager.AppSettings["GreenAPI:BaseUrl"] ?? "https://7105.api.greenapi.com";
    }

    public async Task<(bool success, string message)> SendWhatsAppMessage(string to, string messageBody)
    {
        try
        {
            if (_provider.ToLower() == "greenapi")
            {
                return await SendViaGreenAPI(to, messageBody);
            }
            else
            {
                return await SendViaTwilio(to, messageBody);
            }
        }
        catch (Exception ex)
        {
            return (false, $"Erreur: {ex.Message}");
        }
    }

    private async Task<(bool success, string message)> SendViaGreenAPI(string to, string messageBody)
    {
        using (var httpClient = new HttpClient())
        {
            // Formater le numéro pour Green API
            var phoneNumber = to.Replace("whatsapp:", "").Replace("+", "") + "@c.us";
            
            // Créer le payload
            var payload = new
            {
                chatId = phoneNumber,
                message = messageBody
            };

            // URL de l'API Green
            var url = $"{_greenApiBaseUrl}/waInstance{_greenApiInstanceId}/sendMessage/{_greenApiToken}";
            
            // Envoyer la requête
            var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadAsStringAsync();
                return (true, $"✅ Green API - Message envoyé: {result}");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                return (false, $"❌ Green API - Erreur {response.StatusCode}: {error}");
            }
        }
    }

    private async Task<(bool success, string message)> SendViaTwilio(string to, string messageBody)
    {
        using (var httpClient = new HttpClient())
        {
            // Configuration Twilio existante
            var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_twilioSid}:{_twilioToken}"));
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");

            var formData = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("From", $"whatsapp:{_twilioNumber}"),
                new KeyValuePair<string, string>("To", $"whatsapp:{to}"),
                new KeyValuePair<string, string>("Body", messageBody)
            });

            var twilioUrl = $"https://api.twilio.com/2010-04-01/Accounts/{_twilioSid}/Messages.json";
            var response = await httpClient.PostAsync(twilioUrl, formData);

            if (response.IsSuccessStatusCode)
            {
                return (true, "✅ Twilio - Message envoyé");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                return (false, $"❌ Twilio - Erreur {response.StatusCode}: {error}");
            }
        }
    }

    public string GetProviderName()
    {
        return _provider.ToUpper();
    }
}